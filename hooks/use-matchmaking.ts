import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import type {
  Player,
  CreatePlayerRequest,
  UpdatePlayerRequest,
  TestPlayer,
  CreateTestPlayerRequest,
  MatchmakingRun,
  MatchmakingLog,
  MatchmakingQueueRequest,
  MatchmakingQueueWithReservationRequest,
  MatchmakingReport,
  MatchmakingGroupResponseDto,
  MatchmakingGroupUpdateRequest,
} from "@/types/api";
import mockReport from "@/docs/rapport_matchmaking_1.json";

// Query keys centralisées
export const MATCHMAKING_QUEUE_KEY = ["matchmaking-queue"] as const;

// Type enrichi : Player backend + état UI local
export interface PlayerWithUIState extends Player {
  tolerance: number | null;
  isEnqueued: boolean;
  enqueuedGroupPublicId: string | null;
  teamComposition?: [string | null, string | null, string | null];
}

// Stockage UI local (ne persiste pas au backend)
const PLAYER_TOLERANCE = new Map<string, number | null>(); // publicId → tolerance
let PLAYER_TEAM_COMPOSITION: Record<string, [string | null, string | null, string | null]> = {}; // publicId → 3 coéquipiers (slots 2-4)
let MOCK_RUNS: MatchmakingRun[] = [];
let MOCK_LOGS: Record<string, MatchmakingLog[]> = {};
let MOCK_PLAYER_AVAILABILITY: Record<string, { start: string; end: string }> = {};

// ============================================================================
// GroupViewModel : Données backend d'un groupe (group-centric, read-only)
// ============================================================================

export interface GroupViewModel {
  readonly groupPublicId: string;
  readonly ownerPublicId: string; // group.creatorPublicId (pas slot A!)
  readonly teammateTol: number;
  readonly timeWindowStart: string;
  readonly timeWindowEnd: string;
  readonly clubPublicIds: readonly string[];
  readonly composition: {
    readonly slotA: string | null;
    readonly slotB: string | null;
    readonly slotC: string | null;
    readonly slotD: string | null;
  };
}

/**
 * Construit un Map<playerId, GroupViewModel> à partir des données backend.
 * Tous les joueurs d'un même groupe pointent vers le même ViewModel (read-only).
 */
function buildGroupByPlayerId(
  queueGroups: MatchmakingGroupResponseDto[]
): Map<string, GroupViewModel> {
  const map = new Map<string, GroupViewModel>();

  for (const group of queueGroups) {
    const slotA = group.players.find((p) => p.slot === "A");
    const slotB = group.players.find((p) => p.slot === "B");
    const slotC = group.players.find((p) => p.slot === "C");
    const slotD = group.players.find((p) => p.slot === "D");

    const viewModel: GroupViewModel = Object.freeze({
      groupPublicId: group.publicId,
      ownerPublicId: group.creatorPublicId, // Owner = creatorPublicId
      teammateTol: group.teammateTol,
      timeWindowStart: group.timeWindowStart ?? "",
      timeWindowEnd: group.timeWindowEnd ?? "",
      clubPublicIds: Object.freeze(group.clubPublicIds ?? []),
      composition: Object.freeze({
        slotA: slotA?.playerPublicId ?? null,
        slotB: slotB?.playerPublicId ?? null,
        slotC: slotC?.playerPublicId ?? null,
        slotD: slotD?.playerPublicId ?? null,
      }),
    });

    // Tous les joueurs du groupe pointent vers le même ViewModel
    for (const playerSlot of group.players) {
      map.set(playerSlot.playerPublicId, viewModel);
    }
  }

  return map;
}

/**
 * Hook exposant le mapping playerId → GroupViewModel.
 * Permet d'accéder aux données backend (tolérance, dispos, composition) pour les joueurs enqueued.
 */
export function useGroupByPlayerId(): Map<string, GroupViewModel> {
  const { data: queueGroups } = useMatchmakingQueue();

  return useMemo(
    () =>
      queueGroups
        ? buildGroupByPlayerId(queueGroups)
        : new Map<string, GroupViewModel>(),
    [queueGroups]
  );
}

// Helpers pour dériver l'état de la queue depuis les données backend
function buildEnqueuedPlayerSet(
  queueGroups: MatchmakingGroupResponseDto[]
): Set<string> {
  const set = new Set<string>();
  queueGroups.forEach((g) => {
    g.players.forEach((p) => set.add(p.playerPublicId));
  });
  return set;
}

function buildPlayerToGroupMap(
  queueGroups: MatchmakingGroupResponseDto[]
): Map<string, string> {
  const map = new Map<string, string>();
  queueGroups.forEach((g) => {
    g.players.forEach((p) => {
      if (map.has(p.playerPublicId)) {
        console.warn(
          `Player ${p.playerPublicId} appears in multiple groups (status: ${g.status}). Using first occurrence.`
        );
        return;
      }
      map.set(p.playerPublicId, g.publicId);
    });
  });
  return map;
}

// Helper to round date to next 30-minute slot
function roundToNext30Min(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  result.setSeconds(0, 0);

  if (minutes === 0 || minutes === 30) {
    return result;
  }

  if (minutes < 30) {
    result.setMinutes(30);
  } else {
    result.setHours(result.getHours() + 1, 0, 0, 0);
  }

  return result;
}

// Helper to generate default availability (start: now + 2h, end: now + 10h)
export function generateDefaultAvailability(): {
  start: string;
  end: string;
} {
  const now = new Date();

  // Start: now + 2h, rounded to next 30min slot
  const startDate = roundToNext30Min(new Date(now.getTime() + 2 * 60 * 60 * 1000));

  // End: now + 10h, rounded to next 30min slot
  const endDate = roundToNext30Min(new Date(now.getTime() + 10 * 60 * 60 * 1000));

  // Format as ISO local (without Z)
  const formatISOLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  };

  return {
    start: formatISOLocal(startDate),
    end: formatISOLocal(endDate),
  };
}

// Exported helper to generate a random player name
export function generateRandomPlayerName(): string {
  const names = [
    "Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah",
    "Ivan", "Julia", "Kevin", "Luna", "Marcus", "Nina", "Oscar", "Paula",
  ];

  const firstName = names[Math.floor(Math.random() * names.length)];
  const lastName = String.fromCharCode(65 + Math.floor(Math.random() * 26));

  return `${firstName} ${lastName}.`;
}

// Helper to clean a player from all team compositions
function cleanPlayerFromCompositions(playerId: string) {
  // 1. Vider sa propre composition
  delete PLAYER_TEAM_COMPOSITION[playerId];

  // 2. Le retirer de toutes les autres compositions
  Object.keys(PLAYER_TEAM_COMPOSITION).forEach((key) => {
    const composition = PLAYER_TEAM_COMPOSITION[key];
    const updated = composition.map(id => id === playerId ? null : id) as [string | null, string | null, string | null];
    PLAYER_TEAM_COMPOSITION[key] = updated;
  });
}

// Helper pur : retourne le Set des joueurs utilisés dans au moins une compo
function getPlayersInCompositions(
  compositionByPlayerId: Record<string, [string | null, string | null, string | null]>
): Set<string> {
  const used = new Set<string>();

  Object.entries(compositionByPlayerId).forEach(([ownerId, composition]) => {
    // Si le owner a au moins un coéquipier, il est "bloqué"
    if (composition.some((id) => id !== null)) {
      used.add(ownerId);
    }

    // Tous les coéquipiers sont marqués aussi
    composition.forEach((playerId) => {
      if (playerId) {
        used.add(playerId);
      }
    });
  });

  return used;
}

// ============================================================================
// Mapping front → back pour inscription matchmaking
// ============================================================================

function toIso8601(value: string | number | Date): string {
  // Coerce any incoming value (including numeric timestamps) to a proper ISO string
  if (typeof value === "number") {
    const millis = value > 1_000_000_000_000 ? value : value * 1000; // handle seconds precision
    return new Date(millis).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = Date.parse(value);
  return new Date(parsed).toISOString();
}

function buildEnqueuePayload(
  playerId: string,
  allPlayers: Player[],
  teammateTolOverride?: number // Tolérance passée explicitement depuis le composant
): MatchmakingQueueRequest {
  const player = allPlayers.find((p) => p.publicId === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }

  // 1. Clubs (depuis favoriteClubs)
  const clubPublicIds = player.favoriteClubs?.map((c) => c.publicId) ?? [];
  if (clubPublicIds.length === 0) {
    throw new Error(`Player ${player.displayName} has no favorite clubs`);
  }

  // 2. Time windows (ISO 8601)
  // ✅ CORRECTION: Fallback si availability est undefined
  const availability = MOCK_PLAYER_AVAILABILITY[playerId] ?? generateDefaultAvailability();
  const timeWindowStart = toIso8601(availability.start);
  const timeWindowEnd = toIso8601(availability.end);

  // 3. Tolérance : utiliser override si fourni, sinon lire depuis PLAYER_TOLERANCE
  const teammateTol = teammateTolOverride ?? 0.5;

  // 4. Slots (omit si vide, pas null)
  const composition = PLAYER_TEAM_COMPOSITION[playerId];
  const payload: MatchmakingQueueRequest = {
    clubPublicIds,
    timeWindowStart,
    timeWindowEnd,
    slotA: { playerPublicId: playerId },
    teammateTol,
  };

  // Si team composition définie (slots 1-3 = teammate + 2 opponents)
  if (composition) {
    if (composition[0]) payload.slotB = { playerPublicId: composition[0] };
    if (composition[1]) payload.slotC = { playerPublicId: composition[1] };
    if (composition[2]) payload.slotD = { playerPublicId: composition[2] };
  }

  return payload;
}

// Hook pour récupérer la queue matchmaking
export function useMatchmakingQueue() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: MATCHMAKING_QUEUE_KEY,
    queryFn: () => apiClient.getMatchmakingQueue(),
    refetchInterval: 7000, // Poll toutes les 7s
    enabled: isAuthenticated, // Éviter de poll hors session
  });
}

// Hook pour récupérer les players avec enrichissement UI
export function usePlayers() {
  // Étape 1: Fetch raw backend data
  const playersQuery = useQuery({
    queryKey: ["players"],
    queryFn: () => apiClient.getPlayers(),
  });

  // Étape 2: Fetch queue state
  const { data: queueGroups } = useMatchmakingQueue();

  // Étape 3: Build derived structures (mémoïsés sur queueGroups)
  const enqueuedSet = useMemo(
    () => (queueGroups ? buildEnqueuedPlayerSet(queueGroups) : new Set<string>()),
    [queueGroups]
  );

  const playerToGroupMap = useMemo(
    () => (queueGroups ? buildPlayerToGroupMap(queueGroups) : new Map<string, string>()),
    [queueGroups]
  );

  // Étape 4: Merge UI state (mémoïsé sur playersQuery.data + structures dérivées)
  const playersWithUI = useMemo((): PlayerWithUIState[] | undefined => {
    if (!playersQuery.data) return undefined;

    return playersQuery.data.map((player): PlayerWithUIState => {
      const tolerance = PLAYER_TOLERANCE.has(player.publicId)
        ? PLAYER_TOLERANCE.get(player.publicId) ?? null
        : 0.5;

      return {
        ...player,
        tolerance,
        isEnqueued: enqueuedSet.has(player.publicId),
        enqueuedGroupPublicId: playerToGroupMap.get(player.publicId) ?? null,
        teamComposition: PLAYER_TEAM_COMPOSITION[player.publicId],
      };
    });
  }, [playersQuery.data, enqueuedSet, playerToGroupMap]);

  // Étape 5: Return enriched data
  return {
    ...playersQuery,
    data: playersWithUI,
  };
}

// DEPRECATED: Alias pour compatibilité temporaire
export const useTestPlayers = usePlayers;

export function useCreatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePlayerRequest) => {
      const newPlayer = await apiClient.createPlayer(data);

      // Initialiser l'état UI local pour ce nouveau joueur
      PLAYER_TOLERANCE.set(newPlayer.publicId, 0.5);

      return newPlayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}

// DEPRECATED: Alias temporaire
export const useCreateTestPlayer = useCreatePlayer;

export function useDeletePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (publicId: string) => {
      await apiClient.deletePlayer(publicId);

      // Nettoyer l'état UI local
      PLAYER_TOLERANCE.delete(publicId);
      delete MOCK_PLAYER_AVAILABILITY[publicId];
      cleanPlayerFromCompositions(publicId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ publicId, data }: { publicId: string; data: UpdatePlayerRequest }) =>
      apiClient.updatePlayer(publicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}

// DEPRECATED: Alias temporaire
export const useDeleteTestPlayer = useDeletePlayer;

export function useEnqueuePlayer() {
  const queryClient = useQueryClient();
  const { data: players } = usePlayers();

  return useMutation({
    mutationFn: async ({ playerId, teammateTol }: { playerId: string; teammateTol?: number }) => {
      const payload = buildEnqueuePayload(playerId, players ?? [], teammateTol);
      return apiClient.enqueueMatchmaking(payload);
    },
    onSuccess: () => {
      // Invalider uniquement la queue (players se met à jour automatiquement)
      queryClient.invalidateQueries({ queryKey: MATCHMAKING_QUEUE_KEY });
    },
    onError: (error) => {
      console.error("Erreur lors de l'inscription:", error);
    },
  });
}

export function useDequeuePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupPublicId }: { groupPublicId: string }) => {
      await apiClient.dequeueMatchmaking(groupPublicId);
    },
    onSuccess: () => {
      // Invalider uniquement la queue
      queryClient.invalidateQueries({ queryKey: MATCHMAKING_QUEUE_KEY });
    },
    onError: (error) => {
      console.error("Erreur lors de la désinscription:", error);
    },
  });
}

export function useUpdateMatchmakingGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupPublicId,
      data,
    }: {
      groupPublicId: string;
      data: MatchmakingGroupUpdateRequest;
    }) => {
      return apiClient.updateMatchmakingGroup(groupPublicId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATCHMAKING_QUEUE_KEY });
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}

export function useEnqueueWithReservation() {
  const queryClient = useQueryClient();
  const { data: players } = usePlayers();

  return useMutation({
    mutationFn: async ({
      playerId,
      reservedClubPublicId,
      reservedCourtId,
      reservedStart,
      reservedEnd,
    }: {
      playerId: string;
      reservedClubPublicId: string;
      reservedCourtId: string;
      reservedStart: string; // ISO string
      reservedEnd: string; // ISO string
    }) => {
      const player = players?.find((p) => p.publicId === playerId);
      if (!player) {
        throw new Error(`Player ${playerId} not found`);
      }

      // ✅ CORRECTION: Distinguer undefined vs null pour tolérance
      const toleranceRaw = PLAYER_TOLERANCE.get(playerId);
      const tolerance = toleranceRaw === undefined ? 0.5 : toleranceRaw;
      const teammateTol = tolerance === null ? 10 : Math.max(tolerance, 0.5);

      const composition = PLAYER_TEAM_COMPOSITION[playerId];

      // ✅ DTO with-reservation : PAS de clubPublicIds ni timeWindow
      const payload: MatchmakingQueueWithReservationRequest = {
        reservedClubPublicId,
        reservedCourtId,
        reservedStart: new Date(reservedStart).toISOString(),
        reservedEnd: new Date(reservedEnd).toISOString(),
        slotA: { playerPublicId: playerId },
        teammateTol,
      };

      // Ajouter slots si team composition
      if (composition) {
        if (composition[0]) payload.slotB = { playerPublicId: composition[0] };
        if (composition[1]) payload.slotC = { playerPublicId: composition[1] };
        if (composition[2]) payload.slotD = { playerPublicId: composition[2] };
      }

      return apiClient.enqueueMatchmakingWithReservation(payload);
    },
    onSuccess: () => {
      // Invalider uniquement la queue
      queryClient.invalidateQueries({ queryKey: MATCHMAKING_QUEUE_KEY });
    },
    onError: (error) => {
      console.error("Erreur lors de l'inscription avec réservation:", error);
    },
  });
}

/**
 * Hook pour gérer les disponibilités des joueurs.
 * - Pour les joueurs enqueued ET pas dirty : sync depuis GroupViewModel (backend)
 * - Pour les joueurs non-enqueued OU dirty : utilise le state local
 * - Nettoie MOCK_PLAYER_AVAILABILITY quand un joueur est désenqueué
 */
export function usePlayerAvailability(
  players: PlayerWithUIState[] | undefined,
  groupByPlayerId: Map<string, GroupViewModel>,
  dirtyPlayerIds: Set<string>
) {
  const [availabilityByPlayerId, setAvailabilityByPlayerId] = useState<
    Record<string, { start: string; end: string }>
  >({});

  // Synchroniser depuis backend (groupVM) si pas dirty, sinon garder le state local
  useEffect(() => {
    if (!players) return;

    const defaults = generateDefaultAvailability();
    const next = { ...MOCK_PLAYER_AVAILABILITY };

    // Track les IDs des joueurs actuellement enqueued pour le cleanup
    const currentEnqueuedIds = new Set(groupByPlayerId.keys());

    players.forEach((player) => {
      const groupVM = groupByPlayerId.get(player.publicId);

      if (groupVM && !dirtyPlayerIds.has(player.publicId)) {
        // Joueur enqueued ET pas dirty → sync depuis backend
        next[player.publicId] = {
          start: groupVM.timeWindowStart,
          end: groupVM.timeWindowEnd,
        };
      } else if (!next[player.publicId]) {
        // Joueur non-enqueued OU dirty → initialiser avec defaults si absent
        next[player.publicId] = { start: defaults.start, end: defaults.end };
      }
      // Si dirty → on garde le state local existant (pas de modification)
    });

    // Cleanup : si un joueur n'est plus enqueued et avait des données backend,
    // on le laisse avec ses valeurs actuelles (permet de ré-enqueue avec mêmes dispos)
    // Note: le cleanup complet se fait dans useDeletePlayer

    MOCK_PLAYER_AVAILABILITY = next;
    setAvailabilityByPlayerId(next);
  }, [players, groupByPlayerId, dirtyPlayerIds]);

  // Setter qui écrit dans les deux : module scope + state React
  const setAvailabilityForPlayer = (
    playerId: string,
    availability: { start: string; end: string }
  ) => {
    MOCK_PLAYER_AVAILABILITY[playerId] = availability;
    setAvailabilityByPlayerId((prev) => ({
      ...prev,
      [playerId]: availability,
    }));
  };

  return [availabilityByPlayerId, setAvailabilityForPlayer] as const;
}

export function usePlayerTeamComposition(players: PlayerWithUIState[] | undefined) {
  const [compositionByPlayerId, setCompositionByPlayerId] = useState<
    Record<string, [string | null, string | null, string | null]>
  >({});

  // Synchroniser depuis PLAYER_TEAM_COMPOSITION au mount et quand players change
  useEffect(() => {
    if (!players) return;

    // Simplement synchroniser ce qui existe, sans initialisation automatique
    setCompositionByPlayerId({ ...PLAYER_TEAM_COMPOSITION });
  }, [players]);

  // Setter qui écrit dans les deux : module scope + state React
  const setCompositionForPlayer = (
    playerId: string,
    composition: [string | null, string | null, string | null]
  ) => {
    // Si tous les slots sont vides, supprimer l'entrée
    if (composition.every((id) => id === null)) {
      delete PLAYER_TEAM_COMPOSITION[playerId];
      setCompositionByPlayerId((prev) => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    } else {
      // Sinon, on garde la composition
      PLAYER_TEAM_COMPOSITION[playerId] = composition;
      setCompositionByPlayerId((prev) => ({
        ...prev,
        [playerId]: composition,
      }));
    }
  };

  return [compositionByPlayerId, setCompositionForPlayer] as const;
}

export function usePlayersInCompositions(
  compositionByPlayerId: Record<string, [string | null, string | null, string | null]>
): Record<string, boolean> {
  return useMemo(() => {
    const result: Record<string, boolean> = {};
    const usedPlayers = getPlayersInCompositions(compositionByPlayerId);

    usedPlayers.forEach((playerId) => {
      result[playerId] = true;
    });

    return result;
  }, [compositionByPlayerId]);
}

export function useRunMatchmaking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduledTime }: { scheduledTime: string }) => {
      // Convert scheduledTime (HH:mm format) to ISO date-time format
      const today = new Date();
      const [hours, minutes] = scheduledTime.split(":");
      today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      const executionTime = today.toISOString();

      // Appel API réel
      // Le backend retourne pour l'instant MatchmakingRunResponse { matchCount, executionTime }
      // Plus tard, il retournera MatchmakingReport complet (avec phases, summary, etc.)
      const response = await apiClient.runMatchmaking({ executionTime });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matchmaking-runs"] });
    },
  });
}

export function useMatchmakingLogs(runId: string | null) {
  return useQuery({
    queryKey: ["matchmaking-logs", runId],
    queryFn: async () => {
      if (!runId) return [];

      // TODO: Remplacer par apiClient.getMatchmakingLogs(runId)
      // For now, use mock data

      await new Promise((resolve) => setTimeout(resolve, 200));

      return MOCK_LOGS[runId] || [];
    },
    enabled: !!runId,
  });
}

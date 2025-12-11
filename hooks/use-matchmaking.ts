import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  Player,
  CreatePlayerRequest,
  TestPlayer,
  CreateTestPlayerRequest,
  MatchmakingRun,
  MatchmakingLog,
  MatchmakingRunRequest,
} from "@/types/api";

// Type enrichi : Player backend + état UI local
export interface PlayerWithUIState extends Player {
  tolerance: number | null;
  isEnqueued: boolean;
  teamComposition?: [string | null, string | null, string | null];
}

// Stockage UI local (ne persiste pas au backend)
const PLAYER_TOLERANCE = new Map<string, number | null>(); // publicId → tolerance
const PLAYER_ENQUEUED = new Set<string>();                  // publicId si enqueued
let PLAYER_TEAM_COMPOSITION: Record<string, [string | null, string | null, string | null]> = {}; // publicId → 3 coéquipiers (slots 2-4)
let MOCK_RUNS: MatchmakingRun[] = [];
let MOCK_LOGS: Record<string, MatchmakingLog[]> = {};
let MOCK_PLAYER_AVAILABILITY: Record<string, { start: string; end: string }> = {};

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

export function usePlayers() {
  return useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      // Appeler le vrai backend
      const backendPlayers = await apiClient.getPlayers();

      // Enrichir avec l'état UI local
      return backendPlayers.map((player): PlayerWithUIState => {
        // Gérer tolerance : distinguer "pas d'entrée" (défaut 0.5) et "entrée = null" (garder null)
        const tolerance = PLAYER_TOLERANCE.has(player.publicId)
          ? PLAYER_TOLERANCE.get(player.publicId) ?? null
          : 0.5;

        return {
          ...player,
          tolerance,
          isEnqueued: PLAYER_ENQUEUED.has(player.publicId),
          teamComposition: PLAYER_TEAM_COMPOSITION[player.publicId],
        };
      });
    },
  });
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
      PLAYER_ENQUEUED.delete(publicId);
      delete MOCK_PLAYER_AVAILABILITY[publicId];
      cleanPlayerFromCompositions(publicId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}

// DEPRECATED: Alias temporaire
export const useDeleteTestPlayer = useDeletePlayer;

export function useEnqueuePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playerId, enqueued }: { playerId: string; enqueued: boolean }) => {
      // Phase 1: pur état UI local (pas encore de POST /backoffice/matchmaking/queue)
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (enqueued) {
        PLAYER_ENQUEUED.add(playerId);
      } else {
        PLAYER_ENQUEUED.delete(playerId);
        // Nettoyer les compositions quand le joueur quitte la file
        cleanPlayerFromCompositions(playerId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}

export function useUpdatePlayerTolerance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playerId,
      tolerance,
    }: {
      playerId: string;
      tolerance: number | null;
    }) => {
      // Phase 1: pur état UI local
      await new Promise((resolve) => setTimeout(resolve, 200));

      PLAYER_TOLERANCE.set(playerId, tolerance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}

export function usePlayerAvailability(players: PlayerWithUIState[] | undefined) {
  const [availabilityByPlayerId, setAvailabilityByPlayerId] = useState<
    Record<string, { start: string; end: string }>
  >({});

  // Synchroniser depuis MOCK_PLAYER_AVAILABILITY au mount et quand players change
  useEffect(() => {
    if (!players) return;

    const defaults = generateDefaultAvailability();
    const next = { ...MOCK_PLAYER_AVAILABILITY };

    // Initialiser les nouveaux joueurs avec les defaults
    players.forEach((player) => {
      if (!next[player.publicId]) {
        next[player.publicId] = { start: defaults.start, end: defaults.end };
      }
    });

    MOCK_PLAYER_AVAILABILITY = next;
    setAvailabilityByPlayerId(next);
  }, [players]);

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
    mutationFn: async (request: MatchmakingRunRequest) => {
      // TODO: Remplacer par apiClient.runMatchmaking(request)
      // For now, simulate API call

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { playerIds, scheduledTime } = request;

      // Create mock run
      const runId = `run-${Date.now()}`;
      const matchesCreated = Math.floor(playerIds.length / 4);

      const run: MatchmakingRun = {
        id: runId,
        status: "COMPLETED",
        playerCount: playerIds.length,
        matchesCreated,
        startedAt: new Date().toISOString(),
        completedAt: new Date(Date.now() + 2000).toISOString(),
      };

      MOCK_RUNS.push(run);

      // Generate mock logs
      const logs: MatchmakingLog[] = [
        {
          timestamp: new Date(Date.now() - 2000).toISOString(),
          level: "INFO",
          message: `Démarrage du matchmaking avec ${playerIds.length} joueurs${
            scheduledTime ? ` à ${scheduledTime}` : ""
          }`,
        },
        {
          timestamp: new Date(Date.now() - 1500).toISOString(),
          level: "INFO",
          message: "Analyse des niveaux et préférences...",
        },
        {
          timestamp: new Date(Date.now() - 1000).toISOString(),
          level: "INFO",
          message: `${matchesCreated} matchs potentiels identifiés`,
        },
        {
          timestamp: new Date(Date.now() - 500).toISOString(),
          level: "INFO",
          message: "Vérification des disponibilités...",
          details: { availableSlots: 12 },
        },
        {
          timestamp: new Date().toISOString(),
          level: "INFO",
          message: `Matchmaking terminé : ${matchesCreated} matchs créés`,
          details: { successRate: 85 },
        },
      ];

      MOCK_LOGS[runId] = logs;

      return run;
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

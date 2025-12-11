import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  TestPlayer,
  CreateTestPlayerRequest,
  MatchmakingRun,
  MatchmakingLog,
  MatchmakingRunRequest,
} from "@/types/api";

// Mock data for development - stored in module scope to persist during session
let MOCK_TEST_PLAYERS: TestPlayer[] = [];
let MOCK_RUNS: MatchmakingRun[] = [];
let MOCK_LOGS: Record<string, MatchmakingLog[]> = {};

// Helper to generate mock player
function generateMockPlayer(
  data: CreateTestPlayerRequest
): TestPlayer {
  return {
    id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    name: data.name,
    level: data.level,
    side: data.side,
    availability: data.availability || ["09:00-12:00", "14:00-18:00"],
    isEnqueued: false,
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

// Helper to generate N random players
function generateRandomPlayers(count: number): TestPlayer[] {
  const sides = ["LEFT", "RIGHT", "BOTH"] as const;

  return Array.from({ length: count }, () => {
    // Generate random level between 0.1 and 9.0 with 1 decimal
    const randomLevel = Math.round((Math.random() * 8.9 + 0.1) * 10) / 10;

    return generateMockPlayer({
      name: generateRandomPlayerName(),
      level: randomLevel,
      side: sides[Math.floor(Math.random() * sides.length)],
    });
  });
}

export function useTestPlayers() {
  return useQuery({
    queryKey: ["test-players"],
    queryFn: async () => {
      // TODO: Remplacer par apiClient.getTestPlayers()
      // For now, use mock data

      await new Promise((resolve) => setTimeout(resolve, 200));
      return MOCK_TEST_PLAYERS;
    },
  });
}

export function useCreateTestPlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTestPlayerRequest) => {
      // TODO: Remplacer par apiClient.createTestPlayer(data)
      // For now, simulate API call

      await new Promise((resolve) => setTimeout(resolve, 300));

      const newPlayer = generateMockPlayer(data);
      MOCK_TEST_PLAYERS.push(newPlayer);
      return newPlayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-players"] });
    },
  });
}

export function useCreateRandomPlayers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (count: number) => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newPlayers = generateRandomPlayers(count);
      MOCK_TEST_PLAYERS.push(...newPlayers);
      return newPlayers;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-players"] });
    },
  });
}

export function useDeleteTestPlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playerId: string) => {
      // TODO: Remplacer par apiClient.deleteTestPlayer(playerId)
      // For now, simulate API call

      await new Promise((resolve) => setTimeout(resolve, 200));

      const index = MOCK_TEST_PLAYERS.findIndex((p) => p.id === playerId);
      if (index !== -1) {
        MOCK_TEST_PLAYERS.splice(index, 1);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-players"] });
    },
  });
}

export function useEnqueuePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playerId: string) => {
      // TODO: Remplacer par apiClient.enqueuePlayer(playerId)
      // For now, simulate API call

      await new Promise((resolve) => setTimeout(resolve, 200));

      const player = MOCK_TEST_PLAYERS.find((p) => p.id === playerId);
      if (player) {
        player.isEnqueued = true;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-players"] });
    },
  });
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

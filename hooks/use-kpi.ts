import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { KPIMetrics } from "@/types/api";

// Mock data for development
const MOCK_KPIS: KPIMetrics = {
  matchesCreated24h: 42,
  averageMatchmakingTime: 3.2, // in minutes
  activeUsers: 156,
  successRate: 87.5, // percentage
};

export function useKPIs() {
  return useQuery({
    queryKey: ["kpis"],
    queryFn: async () => {
      // TODO: Remplacer par apiClient.getKPIs()
      // For now, use mock data

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return MOCK_KPIS;
    },
    // Refetch every minute
    refetchInterval: 60000,
  });
}

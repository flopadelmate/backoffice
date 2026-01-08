import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  SpringPage,
  ClubBackofficeListDto,
  ClubBackofficeDetailDto,
  ClubBackofficeUpdateDto,
  GetClubsParams,
  BlacklistResponseDto,
  WhitelistResponseDto,
  BlacklistCreateDto,
  GetWhitelistParams,
  GetBlacklistParams,
} from "@/types/api";

/**
 * Hook to fetch clubs list with pagination and filters
 * Returns Spring Page structure directly from backend
 */
export function useClubs(params?: GetClubsParams) {
  return useQuery<SpringPage<ClubBackofficeListDto>>({
    queryKey: ["clubs", params],
    queryFn: async () => {
      return apiClient.getClubs(params);
    },
  });
}

/**
 * Hook to fetch a single club by ID
 * @param id - Club ID (number, not UUID)
 */
export function useClub(id: number) {
  return useQuery<ClubBackofficeDetailDto>({
    queryKey: ["club", id],
    queryFn: async () => {
      return apiClient.getClub(id);
    },
    enabled: !!id,
  });
}

/**
 * Hook to update a club
 */
export function useUpdateClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: ClubBackofficeUpdateDto;
    }) => {
      return apiClient.updateClub(id, data);
    },
    onSuccess: (updatedClub, variables) => {
      // Avoid UI flicker by immediately updating the detail cache
      queryClient.setQueryData(["club", variables.id], updatedClub);

      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["club", variables.id] });
    },
  });
}

/**
 * Hook to delete a club
 */
export function useDeleteClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      blacklist,
      reason,
    }: {
      id: number;
      blacklist?: boolean;
      reason?: string;
    }) => {
      return apiClient.deleteClub(id, blacklist, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
  });
}

/**
 * Hook to fetch blacklisted clubs (paginated)
 * @param params - Query params (page, size, sortBy, sortDir, filters)
 * @param enabled - Whether to enable the query (use to fetch only when tab is active)
 */
export function useBlacklistedClubs(params?: GetBlacklistParams, enabled: boolean = true) {
  return useQuery<SpringPage<BlacklistResponseDto>>({
    queryKey: ["blacklist", params],
    queryFn: () => apiClient.getBlacklistedClubs(params),
    enabled,
  });
}

/**
 * Hook to fetch whitelisted clubs (paginated)
 * @param params - Query params (page, size, sortBy, sortDir, filters)
 * @param enabled - Whether to enable the query (use to fetch only when tab is active)
 */
export function useWhitelistedClubs(params?: GetWhitelistParams, enabled: boolean = true) {
  return useQuery<SpringPage<WhitelistResponseDto>>({
    queryKey: ["whitelist", params],
    queryFn: () => apiClient.getWhitelistedClubs(params),
    enabled,
  });
}

/**
 * Hook to remove a club from blacklist
 */
export function useRemoveFromBlacklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.removeFromBlacklist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blacklist"] });
    },
  });
}

/**
 * Hook to remove a club from whitelist
 */
export function useRemoveFromWhitelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.removeFromWhitelist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whitelist"] });
    },
  });
}

/**
 * Hook to add a club to whitelist
 */
export function useAddToWhitelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BlacklistCreateDto) => apiClient.addToWhitelist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whitelist"] });
    },
  });
}

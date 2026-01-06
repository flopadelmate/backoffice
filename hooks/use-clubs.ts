import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  SpringPage,
  ClubBackofficeListDto,
  ClubBackofficeDetailDto,
  ClubBackofficeUpdateDto,
  GetClubsParams,
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

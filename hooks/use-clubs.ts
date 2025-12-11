import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Club, ClubUpdateRequest } from "@/types/api";

// Mock data for development
const MOCK_CLUBS: Club[] = [
  {
    id: "1",
    name: "Padel Club Paris Centre",
    city: "Paris",
    address: "123 Rue de Rivoli, 75001 Paris",
    status: "ACTIVE",
    visible: true,
    courtCount: 6,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-06-20T14:30:00Z",
  },
  {
    id: "2",
    name: "Lyon Padel Arena",
    city: "Lyon",
    address: "45 Avenue Jean Jaurès, 69007 Lyon",
    status: "ACTIVE",
    visible: true,
    courtCount: 8,
    createdAt: "2024-02-10T09:00:00Z",
    updatedAt: "2024-07-12T11:15:00Z",
  },
  {
    id: "3",
    name: "Marseille Padel Club",
    city: "Marseille",
    address: "88 Boulevard Michelet, 13008 Marseille",
    status: "INACTIVE",
    visible: false,
    courtCount: 4,
    createdAt: "2024-03-05T08:30:00Z",
    updatedAt: "2024-08-01T16:45:00Z",
  },
  {
    id: "4",
    name: "Toulouse Padel Center",
    city: "Toulouse",
    address: "12 Allée Jean Jaurès, 31000 Toulouse",
    status: "ACTIVE",
    visible: true,
    courtCount: 5,
    createdAt: "2024-04-20T13:00:00Z",
    updatedAt: "2024-09-15T09:20:00Z",
  },
  {
    id: "5",
    name: "Bordeaux Padel Complex",
    city: "Bordeaux",
    address: "78 Cours de la Marne, 33000 Bordeaux",
    status: "PENDING",
    visible: false,
    courtCount: 7,
    createdAt: "2024-05-30T15:30:00Z",
    updatedAt: "2024-10-05T12:00:00Z",
  },
];

interface UseClubsParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function useClubs(params?: UseClubsParams) {
  return useQuery({
    queryKey: ["clubs", params],
    queryFn: async () => {
      // TODO: Remplacer par apiClient.getClubs(params)
      // For now, use mock data

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Simple client-side filtering for mock data
      let filtered = MOCK_CLUBS;
      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        filtered = filtered.filter(
          (club) =>
            club.name.toLowerCase().includes(searchLower) ||
            club.city.toLowerCase().includes(searchLower)
        );
      }

      // Simple pagination
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 10;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginated = filtered.slice(start, end);

      return {
        data: paginated,
        total: filtered.length,
        page,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize),
      };
    },
  });
}

export function useClub(id: string) {
  return useQuery({
    queryKey: ["clubs", id],
    queryFn: async () => {
      // TODO: Remplacer par apiClient.getClub(id)
      // For now, use mock data

      await new Promise((resolve) => setTimeout(resolve, 200));

      const club = MOCK_CLUBS.find((c) => c.id === id);
      if (!club) {
        throw new Error("Club not found");
      }
      return club;
    },
    enabled: !!id,
  });
}

export function useUpdateClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ClubUpdateRequest;
    }) => {
      // TODO: Remplacer par apiClient.updateClub(id, data)
      // For now, simulate success

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Find and update mock data
      const clubIndex = MOCK_CLUBS.findIndex((c) => c.id === id);
      if (clubIndex !== -1) {
        MOCK_CLUBS[clubIndex] = { ...MOCK_CLUBS[clubIndex], ...data };
        return MOCK_CLUBS[clubIndex];
      }

      throw new Error("Club not found");
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["clubs", variables.id] });
    },
  });
}

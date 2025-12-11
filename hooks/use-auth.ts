import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { apiClient } from "@/lib/api-client";
import type { LoginRequest } from "@/types/api";

export function useLogin() {
  const { login } = useAuth();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      // TODO: Remplacer par apiClient.login(credentials)
      // Mock login for development (backend not connected yet)
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

      // Accept any credentials for now
      return {
        accessToken: "mock-jwt-token-dev-12345",
        user: {
          id: "admin-1",
          email: credentials.email,
          name: "Admin User",
          role: "ADMIN" as const,
        },
      };
    },
    onSuccess: (data) => {
      login(data.accessToken, data.user);
    },
  });
}

export function useLogout() {
  const { logout } = useAuth();

  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.logout();
      } catch (error) {
        // Ignore logout errors - we'll clear the session anyway
        console.error("Logout error:", error);
      }
    },
    onSettled: () => {
      // Always logout locally, even if the API call fails
      logout();
    },
  });
}

// Re-export useAuth for convenience
export { useAuth } from "@/providers/auth-provider";

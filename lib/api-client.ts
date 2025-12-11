import type {
  LoginRequest,
  LoginResponse,
  Club,
  ClubUpdateRequest,
  PaginatedResponse,
  KPIMetrics,
  TestPlayer,
  CreateTestPlayerRequest,
  MatchmakingRun,
  MatchmakingRunRequest,
  MatchmakingLog,
} from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

class ApiClient {
  private token: string | null = null;
  private unauthorizedHandler?: () => void;

  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Set a callback to handle 401 Unauthorized errors
   * This will be called automatically when a 401 is detected (except for login endpoint)
   */
  setUnauthorizedHandler(handler: () => void) {
    this.unauthorizedHandler = handler;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        // Don't trigger unauthorized handler for login endpoint (to avoid logout loops)
        const isLoginEndpoint = endpoint.includes("/auth/admin/login");

        if (!isLoginEndpoint && this.unauthorizedHandler) {
          // Token expired or invalid - trigger logout
          this.unauthorizedHandler();
        }

        throw new ApiError("Non autorisé", "UNAUTHORIZED", 401);
      }

      // Handle other error statuses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || "Une erreur est survenue",
          errorData.code,
          response.status
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      throw new ApiError(
        "Erreur de connexion au serveur",
        "NETWORK_ERROR"
      );
    }
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    return this.request<void>("/auth/admin/logout", {
      method: "POST",
    });
  }

  // ============================================================================
  // Clubs
  // ============================================================================

  async getClubs(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResponse<Club>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.pageSize)
      searchParams.set("pageSize", params.pageSize.toString());
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Club>>(
      `/admin/clubs${query ? `?${query}` : ""}`
    );
  }

  async getClub(id: string): Promise<Club> {
    return this.request<Club>(`/admin/clubs/${id}`);
  }

  async updateClub(id: string, data: ClubUpdateRequest): Promise<Club> {
    return this.request<Club>(`/admin/clubs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // KPIs
  // ============================================================================

  async getKPIs(): Promise<KPIMetrics> {
    return this.request<KPIMetrics>("/admin/kpis");
  }

  // ============================================================================
  // Matchmaking Lab
  // ============================================================================

  async createTestPlayer(
    data: CreateTestPlayerRequest
  ): Promise<TestPlayer> {
    return this.request<TestPlayer>("/admin/matchmaking/test-players", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTestPlayers(): Promise<TestPlayer[]> {
    return this.request<TestPlayer[]>("/admin/matchmaking/test-players");
  }

  async enqueuePlayer(playerId: string): Promise<void> {
    return this.request<void>(
      `/admin/matchmaking/test-players/${playerId}/enqueue`,
      {
        method: "POST",
      }
    );
  }

  async runMatchmaking(
    data: MatchmakingRunRequest
  ): Promise<MatchmakingRun> {
    return this.request<MatchmakingRun>("/admin/matchmaking/run", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMatchmakingRun(runId: string): Promise<MatchmakingRun> {
    return this.request<MatchmakingRun>(`/admin/matchmaking/runs/${runId}`);
  }

  async getMatchmakingLogs(runId: string): Promise<MatchmakingLog[]> {
    return this.request<MatchmakingLog[]>(
      `/admin/matchmaking/runs/${runId}/logs`
    );
  }
}

// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

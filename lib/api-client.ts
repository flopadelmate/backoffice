import type {
  LoginRequest,
  BackofficeLoginResponse,
  Club,
  ClubUpdateRequest,
  PaginatedResponse,
  KPIMetrics,
  Player,
  CreatePlayerRequest,
  TestPlayer,
  CreateTestPlayerRequest,
  MatchmakingRunRequest,
  MatchmakingRunResponse,
  MatchmakingQueueRequest,
  MatchmakingQueueWithReservationRequest,
  MatchmakingGroupResponseDto,
} from "@/types/api";

// Use relative path - Next.js will proxy to backend via rewrites
const API_BASE_URL = "/api";

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
        const isLoginEndpoint = endpoint.includes("/backoffice/login");

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

  async login(data: LoginRequest): Promise<BackofficeLoginResponse> {
    return this.request<BackofficeLoginResponse>("/backoffice/login", {
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
  // Players
  // ============================================================================

  async getPlayers(): Promise<Player[]> {
    return this.request<Player[]>("/backoffice/players");
  }

  async createPlayer(data: CreatePlayerRequest): Promise<Player> {
    return this.request<Player>("/backoffice/players", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deletePlayer(publicId: string): Promise<void> {
    return this.request<void>(`/backoffice/players/${publicId}`, {
      method: "DELETE",
    });
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
  ): Promise<MatchmakingRunResponse> {
    return this.request<MatchmakingRunResponse>("/backoffice/matchmaking/run", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // Matchmaking Queue (New endpoints)
  // ============================================================================

  async enqueueMatchmaking(
    request: MatchmakingQueueRequest
  ): Promise<MatchmakingGroupResponseDto> {
    return this.request<MatchmakingGroupResponseDto>(
      "/backoffice/matchmaking/queue",
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  async enqueueMatchmakingWithReservation(
    request: MatchmakingQueueWithReservationRequest
  ): Promise<MatchmakingGroupResponseDto> {
    return this.request<MatchmakingGroupResponseDto>(
      "/backoffice/matchmaking/queue/with-reservation",
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  async dequeueMatchmaking(groupPublicId: string): Promise<void> {
    return this.request<void>(
      `/backoffice/matchmaking/queue/${groupPublicId}`,
      {
        method: "DELETE",
      }
    );
  }

  async getMatchmakingQueue(): Promise<MatchmakingGroupResponseDto[]> {
    return this.request<MatchmakingGroupResponseDto[]>(
      "/backoffice/matchmaking/queue",
      {
        method: "GET",
      }
    );
  }

  // TODO: Implement getMatchmakingRun and getMatchmakingLogs with correct types from swagger
  // These methods were removed during /run endpoint integration as the response types changed
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

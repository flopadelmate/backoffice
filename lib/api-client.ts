import type {
  LoginRequest,
  BackofficeLoginResponse,
  PaginatedResponse,
  KPIMetrics,
  Player,
  CreatePlayerRequest,
  UpdatePlayerRequest,
  TestPlayer,
  CreateTestPlayerRequest,
  MatchmakingRunRequest,
  MatchmakingRunResponse,
  MatchmakingQueueRequest,
  MatchmakingQueueWithReservationRequest,
  MatchmakingGroupResponseDto,
  MatchmakingGroupUpdateRequest,
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
  ExternalIdAliasCreateDto,
  ExternalIdAliasDto,
  ReservationSystemDto,
  ExternalIdDto,
  CreateExternalIdDto,
  UpdateExternalIdDto,
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

  async getClubs(
    params?: GetClubsParams
  ): Promise<SpringPage<ClubBackofficeListDto>> {
    const searchParams = new URLSearchParams();

    // Handle page (0-indexed) - use != null to avoid falsy 0
    if (params?.page != null) {
      searchParams.set("page", params.page.toString());
    }
    if (params?.size != null) {
      searchParams.set("size", params.size.toString());
    }
    if (params?.sortBy != null) {
      searchParams.set("sortBy", params.sortBy);
    }
    if (params?.sortDir != null) {
      searchParams.set("sortDir", params.sortDir);
    }

    // Optional filters
    if (params?.name != null) {
      searchParams.set("name", params.name);
    }
    if (params?.department != null) {
      searchParams.set("department", params.department);
    }
    if (params?.verified != null) {
      searchParams.set("verified", params.verified.toString());
    }
    if (params?.reservationSystem != null) {
      searchParams.set("reservationSystem", params.reservationSystem);
    }
    if (params?.minFavoriteCount != null) {
      searchParams.set("minFavoriteCount", params.minFavoriteCount.toString());
    }
    if (params?.minMatchCount != null) {
      searchParams.set("minMatchCount", params.minMatchCount.toString());
    }

    const query = searchParams.toString();
    return this.request<SpringPage<ClubBackofficeListDto>>(
      `/backoffice/clubs${query ? `?${query}` : ""}`
    );
  }

  async getClub(id: number): Promise<ClubBackofficeDetailDto> {
    return this.request<ClubBackofficeDetailDto>(`/backoffice/clubs/${id}`);
  }

  async updateClub(
    id: number,
    data: ClubBackofficeUpdateDto
  ): Promise<ClubBackofficeDetailDto> {
    return this.request<ClubBackofficeDetailDto>(`/backoffice/clubs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteClub(
    id: number,
    blacklist?: boolean,
    reason?: string
  ): Promise<void> {
    const params = new URLSearchParams();
    if (blacklist) {
      params.set("blacklist", "true");
    }
    if (reason) {
      params.set("reason", reason);
    }
    const query = params.toString();
    return this.request<void>(
      `/backoffice/clubs/${id}${query ? `?${query}` : ""}`,
      {
        method: "DELETE",
      }
    );
  }

  async getBlacklistedClubs(
    params?: GetBlacklistParams
  ): Promise<SpringPage<BlacklistResponseDto>> {
    const searchParams = new URLSearchParams();

    if (params?.page != null) {
      searchParams.set("page", params.page.toString());
    }
    if (params?.size != null) {
      searchParams.set("size", params.size.toString());
    }
    if (params?.sortBy != null) {
      searchParams.set("sortBy", params.sortBy);
    }
    if (params?.sortDir != null) {
      searchParams.set("sortDir", params.sortDir);
    }
    if (params?.externalId != null) {
      searchParams.set("externalId", params.externalId);
    }
    if (params?.source != null) {
      searchParams.set("source", params.source);
    }

    const query = searchParams.toString();
    return this.request<SpringPage<BlacklistResponseDto>>(
      `/backoffice/blacklist${query ? `?${query}` : ""}`
    );
  }

  async removeFromBlacklist(id: number): Promise<void> {
    return this.request<void>(`/backoffice/blacklist/${id}`, {
      method: "DELETE",
    });
  }

  async getWhitelistedClubs(
    params?: GetWhitelistParams
  ): Promise<SpringPage<WhitelistResponseDto>> {
    const searchParams = new URLSearchParams();

    if (params?.page != null) {
      searchParams.set("page", params.page.toString());
    }
    if (params?.size != null) {
      searchParams.set("size", params.size.toString());
    }
    if (params?.sortBy != null) {
      searchParams.set("sortBy", params.sortBy);
    }
    if (params?.sortDir != null) {
      searchParams.set("sortDir", params.sortDir);
    }
    if (params?.externalId != null) {
      searchParams.set("externalId", params.externalId);
    }

    const query = searchParams.toString();
    return this.request<SpringPage<WhitelistResponseDto>>(
      `/backoffice/whitelist${query ? `?${query}` : ""}`
    );
  }

  async removeFromWhitelist(id: number): Promise<void> {
    return this.request<void>(`/backoffice/whitelist/${id}`, {
      method: "DELETE",
    });
  }

  async addToWhitelist(data: BlacklistCreateDto): Promise<void> {
    return this.request<void>("/backoffice/whitelist", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createExternalIdAlias(
    data: ExternalIdAliasCreateDto
  ): Promise<ExternalIdAliasDto> {
    return this.request<ExternalIdAliasDto>("/backoffice/external-id-aliases", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // Reservation System
  // ============================================================================

  async getReservationSystem(clubId: number): Promise<ReservationSystemDto> {
    return this.request<ReservationSystemDto>(
      `/backoffice/clubs/${clubId}/reservation-system`
    );
  }

  async updateReservationSystem(
    clubId: number,
    data: ReservationSystemDto
  ): Promise<ReservationSystemDto> {
    return this.request<ReservationSystemDto>(
      `/backoffice/clubs/${clubId}/reservation-system`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  // ============================================================================
  // External IDs
  // ============================================================================

  async getExternalIds(clubId: number): Promise<ExternalIdDto[]> {
    return this.request<ExternalIdDto[]>(
      `/backoffice/clubs/${clubId}/external-ids`
    );
  }

  async createExternalId(
    clubId: number,
    data: CreateExternalIdDto
  ): Promise<ExternalIdDto> {
    return this.request<ExternalIdDto>(
      `/backoffice/clubs/${clubId}/external-ids`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateExternalId(
    clubId: number,
    externalIdId: number,
    data: UpdateExternalIdDto
  ): Promise<ExternalIdDto> {
    return this.request<ExternalIdDto>(
      `/backoffice/clubs/${clubId}/external-ids/${externalIdId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
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

  async updatePlayer(publicId: string, data: UpdatePlayerRequest): Promise<Player> {
    return this.request<Player>(`/backoffice/players/${publicId}`, {
      method: "PUT",
      body: JSON.stringify(data),
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

  async updateMatchmakingGroup(
    groupPublicId: string,
    data: MatchmakingGroupUpdateRequest
  ): Promise<MatchmakingGroupResponseDto> {
    return this.request<MatchmakingGroupResponseDto>(
      `/backoffice/matchmaking/queue/${groupPublicId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
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

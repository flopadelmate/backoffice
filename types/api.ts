// ============================================================================
// Authentication Types
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

// Response from /backoffice/login endpoint
export interface BackofficeLoginResponse {
  jwt: string;
}

// Internal type for auth state management
export interface LoginResponse {
  accessToken: string;
  user: AdminUser;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN";
}

// Hardcoded admin user (single backoffice account)
export const HARDCODED_ADMIN_USER: AdminUser = {
  id: "admin",
  email: "admin@padelmate.com",
  name: "Admin",
  role: "ADMIN",
};

// ============================================================================
// Common Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// ============================================================================
// Club Types
// ============================================================================

export type ClubStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export interface Club {
  id: string;
  name: string;
  city: string;
  address: string;
  status: ClubStatus;
  visible: boolean;
  courtCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClubUpdateRequest {
  status?: ClubStatus;
  visible?: boolean;
  courtCount?: number;
}

// ============================================================================
// KPI Types
// ============================================================================

export interface KPIMetrics {
  matchesCreated24h: number;
  averageMatchmakingTime: number;
  activeUsers: number;
  successRate: number;
}

// ============================================================================
// Player Types (Backend)
// ============================================================================

export interface ClubSimpleDto {
  publicId: string;
  name: string;
  city: string;
}

export interface Player {
  publicId: string;
  displayName: string;
  pmr: number; // Player Match Rating: 0.1-9.0
  preferredCourtPosition: "LEFT" | "RIGHT" | "BOTH" | null;
  favoriteClubs?: ClubSimpleDto[];
}

export interface CreatePlayerRequest {
  displayName: string;
  pmr: number;
  preferredCourtPosition: "LEFT" | "RIGHT" | "BOTH";
}

// ============================================================================
// Matchmaking Lab Types
// ============================================================================

export type PlayerSide = "LEFT" | "RIGHT" | "BOTH";

export interface TestPlayer {
  id: string;
  name: string;
  level: number;
  side: PlayerSide;
  tolerance: number | null; // Level tolerance: 0.25, 0.5, 1, 2, or null (all)
  isEnqueued: boolean;
}

export interface CreateTestPlayerRequest {
  name: string;
  level: number;
  side: PlayerSide;
  tolerance?: number | null;
}

export interface MatchmakingRunRequest {
  playerIds: string[];
  scheduledTime?: string;
}

export interface MatchmakingRun {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  playerCount: number;
  matchesCreated: number;
  startedAt: string;
  completedAt?: string;
}

export interface MatchmakingLog {
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
  playerId?: string;
  matchId?: string;
  details?: Record<string, unknown>;
}

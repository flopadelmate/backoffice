// ============================================================================
// Authentication Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

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
// Matchmaking Lab Types
// ============================================================================

export type PlayerSide = "LEFT" | "RIGHT" | "BOTH";
export type PlayerLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface TestPlayer {
  id: string;
  name: string;
  level: PlayerLevel;
  side: PlayerSide;
  availability: string[]; // time slots
  isEnqueued: boolean;
}

export interface CreateTestPlayerRequest {
  name: string;
  level: PlayerLevel;
  side: PlayerSide;
  availability?: string[];
}

export interface MatchmakingRunRequest {
  playerIds: string[];
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

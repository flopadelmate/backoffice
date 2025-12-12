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
  executionTime: string; // ISO date-time format (e.g., "2024-12-12T14:30:00")
}

export interface MatchmakingRunResponse {
  matchCount: number;
  executionTime: string; // ISO date-time format
}

export interface MatchmakingLog {
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
  playerId?: string;
  matchId?: string;
  details?: Record<string, unknown>;
}

export interface MatchmakingRun {
  id: string;
  status: "COMPLETED" | "FAILED" | "IN_PROGRESS";
  playerCount: number;
  matchesCreated: number;
  startedAt: string;
  completedAt?: string;
}

// ============================================================================
// Matchmaking Queue Types
// ============================================================================

export interface PlayerSlotDto {
  playerPublicId: string;
}

export interface MatchmakingQueueRequest {
  clubPublicIds: string[];
  timeWindowStart: string; // ISO 8601
  timeWindowEnd: string; // ISO 8601
  slotA: PlayerSlotDto;
  slotB?: PlayerSlotDto; // Omit if empty
  slotC?: PlayerSlotDto; // Omit if empty
  slotD?: PlayerSlotDto; // Omit if empty
  teammateTol: number; // 0.5-10.0
}

export interface MatchmakingQueueWithReservationRequest {
  reservedClubPublicId: string;
  reservedStart: string; // ISO 8601
  reservedEnd: string; // ISO 8601
  reservedCourtId: string;
  slotA: PlayerSlotDto;
  slotB?: PlayerSlotDto; // Omit if empty
  slotC?: PlayerSlotDto; // Omit if empty
  slotD?: PlayerSlotDto; // Omit if empty
  teammateTol: number; // 0.5-10.0
  solo?: boolean; // Optional
}

export interface PlayerSlotResponseDto {
  playerPublicId: string;
  displayName: string;
  slot: "A" | "B" | "C" | "D";
  pmr: number;
}

export interface MatchmakingGroupResponseDto {
  publicId: string;
  type: string;
  status: string;
  creatorPublicId: string;
  teammateTol: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  clubPublicIds?: string[];
  players: PlayerSlotResponseDto[];
  createdAt: string;
  reservedSlot?: {
    clubPublicId: string;
    courtId: string;
    start: string;
    end: string;
  };
}

// ============================================================================
// Matchmaking Report Types (from /backoffice/matchmaking/run)
// ============================================================================

// Base types for report
export interface MatchingSummary {
  groupsProcessed: number;
  matchesCreated: number;
  playersMatched: number;
  playersUnmatched: number;
  groupsExpired: number;
}

// Bucket types (distinct per phase)
export interface BucketGeneration {
  id: string; // Note: BUCKET_GENERATION uses "id"
  club: string;
  clubPublicId: string;
  start: string;
  durationMinutes: number;
  anchor: boolean;
  reservedBy: {
    groupPublicId: string;
    creator: string;
    courtId: string;
  } | null;
}

export interface EligibleGroup {
  publicId: string;
  type: string;
  players: Array<{ name: string; pmr: number }>;
}

export interface BucketEnrichmentDetail {
  bucketId: string; // Note: Other phases use "bucketId"
  club: string;
  start: string;
  anchor: boolean;
  eligibleGroups: EligibleGroup[];
  playerCount: number;
  kept: boolean;
  reason: string;
}

export interface PlayerInMatch {
  name: string;
  pmr: number;
  position: "LEFT" | "RIGHT";
  groupPublicId: string;
}

export interface MatchSlot {
  start: string;
  end: string;
  courtId: string;
}

export interface SourceGroup {
  publicId: string;
  type: string;
  previousStatus: string;
  newStatus: string;
}

export interface FinalMatch {
  matchPublicId: string;
  team1: PlayerInMatch[];
  team2: PlayerInMatch[];
  avgTeam1: number;
  avgTeam2: number;
  quality: number;
  score: number;
  club: string;
  slot: MatchSlot;
  captain: string;
  status: string;
  sourceGroups: SourceGroup[];
}

export interface CheckDetail {
  gap?: number;
  maxAllowed?: number;
  pass?: boolean;
  charlieMax?: number;
  dianaMax?: number;
  charlie?: string;
  diana?: string;
  valid?: boolean;
  reason?: string;
}

export interface ProcessingLog {
  step: string;
  group?: {
    publicId: string;
    players: string[];
    teammateTol?: number;
    avgPmr?: number;
  };
  solosAvailable?: Array<{ name: string; pmr: number; teammateTol: number }>;
  combination?: string[];
  checks?: Record<string, CheckDetail>;
  result?: string;
}

export interface Candidate {
  id: string;
  team1: Array<{ name: string; pmr: number; position: string }>;
  team2: Array<{ name: string; pmr: number; position: string }>;
  avgTeam1: number;
  avgTeam2: number;
  quality: number;
  score: number;
  selected: boolean;
  rejectionReason?: string;
  sourceGroups: string[];
}

export interface Rejection {
  reason: string;
  details: string;
  groupsAffected: string[];
}

export interface MatchingDetail {
  bucketId: string;
  club: string;
  start: string;
  anchor: boolean;
  processingLog: ProcessingLog[];
  candidates: Candidate[];
  rejections: Rejection[];
}

export interface SlotValidationDetail {
  candidateId: string;
  bucket: {
    club: string;
    start: string;
    durationMinutes: number;
  };
  isAnchored: boolean;
  skipValidation: boolean;
  reason: string;
  compatibleSlots: Array<{
    courtId: string;
    club: string;
    start: string;
    end: string;
    source: string;
  }>;
}

export interface InputCandidates {
  heteroAnchored: number;
  heteroVirtual: number;
  homoAnchored: number;
  homoVirtual: number;
  quatuor: number;
}

export interface SelectionStep {
  step: string;
  action: string;
  count: number;
  inputCount?: number;
  selectedCount?: number;
  note?: string;
}

export interface ExpiredGroup {
  publicId: string;
  type: string;
  creator: string;
  timeWindowEnd: string;
  reason: string;
}

export interface UnmatchedGroup {
  publicId: string;
  type: string;
  players: Array<{ name: string; pmr: number }>;
  timeWindow: {
    start: string;
    end: string;
  };
  clubs: string[];
  reason: string;
}

// Discriminated union for phases
export type MatchingPhase =
  | {
      name: "EXPIRATION";
      durationMs: number;
      groupsExpired: ExpiredGroup[];
    }
  | {
      name: "BUCKET_GENERATION";
      durationMs: number;
      anchoredBuckets: number;
      virtualBuckets: number;
      buckets: BucketGeneration[];
    }
  | {
      name: "BUCKET_ENRICHMENT";
      durationMs: number;
      totalBuckets: number;
      bucketsWithEnoughPlayers: number;
      bucketsFiltered: number;
      details: BucketEnrichmentDetail[];
    }
  | {
      name: "HETERO_MATCHING";
      durationMs: number;
      bucketsProcessed: number;
      candidatesGenerated: number;
      matchesSelected: number;
      details: MatchingDetail[];
    }
  | {
      name: "HOMO_MATCHING_ANCHORED";
      durationMs: number;
      bucketsProcessed: number;
      candidatesGenerated: number;
      matchesSelected: number;
      details: MatchingDetail[];
      note?: string;
    }
  | {
      name: "HOMO_MATCHING_VIRTUAL";
      durationMs: number;
      bucketsProcessed: number;
      candidatesGenerated: number;
      matchesSelected: number;
      details: MatchingDetail[];
      note?: string;
    }
  | {
      name: "SLOT_VALIDATION";
      durationMs: number;
      matchesToValidate: number;
      details: SlotValidationDetail[];
      summary: {
        matchesWithSlots: number;
        matchesWithoutSlots: number;
      };
    }
  | {
      name: "FINAL_SELECTION";
      durationMs: number;
      inputCandidates: InputCandidates;
      selectionProcess: SelectionStep[];
      finalMatches: FinalMatch[];
    };

// Main report type
export interface MatchmakingReport {
  runId: string;
  executionTime: string;
  durationMs: number;
  summary: MatchingSummary;
  phases: MatchingPhase[];
  unmatchedGroups: UnmatchedGroup[];
}

// ============================================================================
// Matchmaking Report ViewModels (for UI)
// ============================================================================

export interface ReportCounts {
  matchesCreated: number; // Calculated from finalMatches.length
  playersMatched: number; // Calculated from finalMatches
  unmatchedGroups: number; // unmatchedGroups.length
  playersUnmatched: number; // Calculated from unmatchedGroups
  expiredGroups: number; // groupsExpired.length
  groupsProcessed: number; // From summary (not recalculated)
}

export interface ReportMeta {
  runId: string;
  executionTime: Date;
  durationMs: number;
}

export interface ExpiredGroupViewModel {
  publicId: string;
  type: string;
  creator: string;
  timeWindowEnd: Date;
  reason: string;
}

export interface UnmatchedGroupViewModel {
  publicId: string;
  type: string;
  players: Array<{ name: string; pmr: number }>;
  timeWindow: {
    start: Date;
    end: Date;
  };
  clubs: string[];
  reason: string;
}

export interface CreatedMatchViewModel {
  matchId: string;
  team1: PlayerInMatch[];
  team2: PlayerInMatch[];
  club: string;
  slot: {
    start: Date;
    end: Date;
    courtId: string;
  };
  stats: {
    avgTeam1: number;
    avgTeam2: number;
    quality: number;
    score: number;
  };
  captain: string;
  status: string;
  sourceGroups: SourceGroup[];
}

export interface ReportViewModel {
  meta: ReportMeta;
  counts: ReportCounts;
  summaryFromBackend: MatchingSummary;
  hasSummaryDivergence: boolean;
  createdMatches: CreatedMatchViewModel[];
  unmatchedGroups: UnmatchedGroupViewModel[];
  expiredGroups: ExpiredGroupViewModel[];
}

// Debug info types (extracted on-demand, not in ViewModel)
export interface BucketDebugInfo {
  bucketId: string;
  club: string;
  start: string;
  anchor: boolean;
  kept: boolean;
  reason: string;
  reservedBy?: {
    groupPublicId: string;
    creator: string;
    courtId: string;
  };
}

export interface CandidateDebugInfo {
  candidateId: string;
  team1: Array<{ name: string; pmr: number; position: string }>;
  team2: Array<{ name: string; pmr: number; position: string }>;
  avgTeam1: number;
  avgTeam2: number;
  quality: number;
  score: number;
  selected: boolean;
  rejectionReason?: string;
}

export interface CheckDebugInfo {
  name: string;
  details: CheckDetail;
}

export interface SlotValidationDebugInfo {
  skipValidation: boolean;
  reason: string;
  compatibleSlots: Array<{
    courtId: string;
    club: string;
    start: string;
    end: string;
    source: string;
  }>;
}

export interface MatchDebugInfo {
  bucket: BucketDebugInfo;
  candidates: CandidateDebugInfo[];
  checks: CheckDebugInfo[];
  slotValidation: SlotValidationDebugInfo;
  processingLogs: ProcessingLog[];
  rejections: Rejection[];
}

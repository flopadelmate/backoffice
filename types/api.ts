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
// Club Types (Backend API)
// ============================================================================

export type ReservationSystem = "GESTION_SPORTS" | "DOIN_SPORT" | "TENUP";

// Spring Page response structure
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // Current page (0-indexed)
  size: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  pageable: {
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
}

// Club list DTO (returned in SpringPage.content from GET /backoffice/clubs)
export interface ClubBackofficeListDto {
  id: number;
  publicId: string;
  name: string;
  city: string;
  department: string;
  verified: boolean;
  reservationSystem?: ReservationSystem;
  favoriteCount: number;
  matchCount: number;
  lastAdminUpdateAt: string; // ISO datetime
  lastScrapedAt: string; // ISO datetime
}

// Query parameters for GET /backoffice/clubs
export interface GetClubsParams {
  page?: number; // Default: 0 (0-indexed)
  size?: number; // Default: 20
  sortBy?: string; // Default: "name"
  sortDir?: "asc" | "desc"; // Default: "asc"
  // Optional filters
  department?: string;
  verified?: boolean;
  reservationSystem?: ReservationSystem;
  minFavoriteCount?: number;
  minMatchCount?: number;
}

// Club detail DTO (returned from GET /backoffice/clubs/{id})
export interface ClubBackofficeDetailDto {
  id: number;
  publicId: string;
  name: string;
  phone: string;
  address: {
    street: string;
    zipCode: string;
    city: string;
  };
  websiteUrl: string;
  latitude: number;
  longitude: number;
  googleRating: number;
  googleReviewCount: number;
  photoUrls: string[];
  mainPhotoUrl: string;
  openingHours: Array<{
    day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    openTime: string;
    closeTime: string;
  }>;
  favoriteCount: number;
  matchCount: number;
  reservationSystem?: ReservationSystem;
  reservationUrl: string;
  courts: Array<{
    name: string;
    sportType: string;
    surface: string;
    indoor: boolean;
  }>;
  verified: boolean;
  notes: string;
  lastAdminUpdateAt: string; // ISO datetime
  lastScrapedAt: string; // ISO datetime
}

// Update DTO for PUT /backoffice/clubs/{id}
export interface ClubBackofficeUpdateDto {
  name?: string;
  phone?: string;
  address?: {
    street: string;
    zipCode: string;
    city: string;
  };
  websiteUrl?: string;
  geo?: {
    latitude: number;
    longitude: number;
  };
  reservationSystem?: ReservationSystem;
  reservationUrl?: string;
  mainPhotoUrl?: string;
  verified?: boolean;
  notes?: string;
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

export interface UpdatePlayerRequest {
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
  dryRun?: boolean; // Optional: if true, runs in dry-run mode (no DB changes)
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

export interface MatchmakingGroupUpdateRequest {
  clubPublicIds?: string[];
  timeWindowStart?: string; // ISO 8601 RFC3339
  timeWindowEnd?: string; // ISO 8601 RFC3339
  teammateTol?: number; // 0.5-10.0
  slotA?: PlayerSlotDto;
  slotB?: PlayerSlotDto;
  slotC?: PlayerSlotDto;
  slotD?: PlayerSlotDto;
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
  slotA?: PlayerSlotResponseDto;
  slotB?: PlayerSlotResponseDto;
  slotC?: PlayerSlotResponseDto;
  slotD?: PlayerSlotResponseDto;
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

// Legacy format (old API structure)
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

// New format (current API structure with data wrapper)
export interface NewPlayerInMatch {
  name: string;
  pmr: number;
  publicId: string;
}

export interface NewSourceGroup {
  publicId: string;
  type: string;
}

export interface NewFinalMatch {
  bucketId: string;
  team1: NewPlayerInMatch[];
  team2: NewPlayerInMatch[];
  avgTeam1: number;
  avgTeam2: number;
  quality: number;
  score: number;
  club: string;
  slotStart: string;
  slotEnd: string;
  captain: string;
  sourceGroups: NewSourceGroup[];
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

// ============================================================================
// Phase Data Wrappers (New API Format)
// ============================================================================

export interface LoadAndExpirationData {
  groupsLoaded: number;
  groupsExpired: number;
  expiredDetails: ExpiredGroup[];
}

export interface BucketGenerationData {
  totalBuckets: number;
  anchoredBuckets: number;
  virtualBuckets: number;
  buckets: BucketGeneration[];
}

export interface BucketEnrichmentData {
  totalBuckets: number;
  bucketsWithEnoughPlayers: number;
  bucketsFiltered: number;
  details: BucketEnrichmentDetail[];
}

export interface HeteroMatchingData {
  bucketsProcessed: number;
  matchesSelected: number;
  // Note: No details/candidates/checks in lite payload
}

export interface HomoMatchingData {
  anchored_candidatesGenerated: number;
  anchored_matchesSelected: number;
  virtual_candidatesGenerated: number;
  virtual_matchesSelected: number;
  // Note: No details/candidates/checks in lite payload
}

export interface SlotValidationData {
  matchesToValidate: number;
  details: Array<{
    bucketId: string;
    isAnchored: boolean;
    compatibleSlotsFound: number;
  }>;
}

export interface FinalSelectionData {
  finalMatchesCount: number;
  finalMatches: NewFinalMatch[];
}

// ============================================================================
// Discriminated union for phases (supports both legacy and new formats)
// ============================================================================
export type MatchingPhase =
  // Legacy EXPIRATION phase
  | {
      name: "EXPIRATION";
      durationMs: number;
      groupsExpired: ExpiredGroup[];
    }
  // New LOAD_AND_EXPIRATION phase (replaces EXPIRATION)
  | {
      name: "LOAD_AND_EXPIRATION";
      durationMs: number;
      data: LoadAndExpirationData;
    }
  // Legacy BUCKET_GENERATION phase
  | {
      name: "BUCKET_GENERATION";
      durationMs: number;
      anchoredBuckets: number;
      virtualBuckets: number;
      buckets: BucketGeneration[];
    }
  // New BUCKET_GENERATION phase
  | {
      name: "BUCKET_GENERATION";
      durationMs: number;
      data: BucketGenerationData;
    }
  // Legacy BUCKET_ENRICHMENT phase
  | {
      name: "BUCKET_ENRICHMENT";
      durationMs: number;
      totalBuckets: number;
      bucketsWithEnoughPlayers: number;
      bucketsFiltered: number;
      details: BucketEnrichmentDetail[];
    }
  // New BUCKET_ENRICHMENT phase
  | {
      name: "BUCKET_ENRICHMENT";
      durationMs: number;
      data: BucketEnrichmentData;
    }
  // Legacy HETERO_MATCHING phase
  | {
      name: "HETERO_MATCHING";
      durationMs: number;
      bucketsProcessed: number;
      candidatesGenerated: number;
      matchesSelected: number;
      details: MatchingDetail[];
    }
  // New HETERO_MATCHING phase (lite payload - no details)
  | {
      name: "HETERO_MATCHING";
      durationMs: number;
      data: HeteroMatchingData;
    }
  // Legacy HOMO_MATCHING_ANCHORED phase
  | {
      name: "HOMO_MATCHING_ANCHORED";
      durationMs: number;
      bucketsProcessed: number;
      candidatesGenerated: number;
      matchesSelected: number;
      details: MatchingDetail[];
      note?: string;
    }
  // Legacy HOMO_MATCHING_VIRTUAL phase
  | {
      name: "HOMO_MATCHING_VIRTUAL";
      durationMs: number;
      bucketsProcessed: number;
      candidatesGenerated: number;
      matchesSelected: number;
      details: MatchingDetail[];
      note?: string;
    }
  // New HOMO_MATCHING phase (replaces HOMO_MATCHING_ANCHORED + HOMO_MATCHING_VIRTUAL, lite payload)
  | {
      name: "HOMO_MATCHING";
      durationMs: number;
      data: HomoMatchingData;
    }
  // Legacy SLOT_VALIDATION phase
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
  // New SLOT_VALIDATION phase
  | {
      name: "SLOT_VALIDATION";
      durationMs: number;
      data: SlotValidationData;
    }
  // Legacy FINAL_SELECTION phase
  | {
      name: "FINAL_SELECTION";
      durationMs: number;
      inputCandidates: InputCandidates;
      selectionProcess: SelectionStep[];
      finalMatches: FinalMatch[];
    }
  // New FINAL_SELECTION phase
  | {
      name: "FINAL_SELECTION";
      durationMs: number;
      data: FinalSelectionData;
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

// Player in match for UI (flexible format compatible with both old and new API)
export interface PlayerInMatchViewModel {
  name: string;
  pmr: number;
  playerId?: string; // New format: publicId
  position?: "LEFT" | "RIGHT"; // Legacy format only
  groupPublicId?: string; // Legacy format only
}

export interface CreatedMatchViewModel {
  matchId: string;
  team1: PlayerInMatchViewModel[];
  team2: PlayerInMatchViewModel[];
  club: string;
  slot: {
    start: Date;
    end: Date;
    courtId?: string; // Optional (not in new format)
  };
  stats: {
    avgTeam1: number;
    avgTeam2: number;
    quality: number;
    score: number;
  };
  captain: string;
  status: string;
  sourceGroups: SourceGroup[] | NewSourceGroup[]; // Support both formats
}

export interface ReportViewModel {
  meta: ReportMeta;
  summary: MatchingSummary; // Backend est la source de vérité unique
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

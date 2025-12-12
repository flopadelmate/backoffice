import type {
  MatchmakingReport,
  ReportViewModel,
  CreatedMatchViewModel,
  UnmatchedGroupViewModel,
  ExpiredGroupViewModel,
  MatchDebugInfo,
  BucketDebugInfo,
  CandidateDebugInfo,
  CheckDebugInfo,
  SlotValidationDebugInfo,
  MatchingPhase,
  FinalMatch,
  NewFinalMatch,
  ProcessingLog,
  Rejection,
  LoadAndExpirationData,
  FinalSelectionData,
  BucketEnrichmentData,
  HeteroMatchingData,
  HomoMatchingData,
} from "@/types/api";

// ============================================================================
// Type Guards (no `any` - uses `unknown` + narrowing)
// ============================================================================

/**
 * Type guard: détecte si une phase utilise le nouveau format avec wrapper `data`
 */
function hasDataWrapper<T>(
  phase: unknown
): phase is { name: string; durationMs: number; data: T } {
  return (
    typeof phase === "object" &&
    phase !== null &&
    "data" in phase &&
    typeof (phase as { data?: unknown }).data === "object"
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Génère un matchId stable à partir des données du match
 * Format: `${bucketId}:${slotStart}`
 */
function generateMatchId(match: NewFinalMatch): string {
  return `${match.bucketId}:${match.slotStart}`;
}

/**
 * Transforme le rapport brut en ViewModel optimisé pour l'UI
 * Le backend est la source de vérité unique - aucun recalcul côté UI
 * Défensif : tolère phases absentes, champs optionnels, arrays vides
 * Compatible avec ancien et nouveau format de rapport (détection automatique)
 * @param report - Rapport brut de l'API
 */
export function transformReportToViewModel(
  report: MatchmakingReport
): ReportViewModel {
  // Extraire phases (supporte nouveau et ancien format)
  const finalSelection = report.phases?.find((p) => p.name === "FINAL_SELECTION");
  const loadAndExpiration = report.phases?.find(
    (p) => p.name === "LOAD_AND_EXPIRATION"
  );
  const expiration = report.phases?.find((p) => p.name === "EXPIRATION"); // Legacy fallback

  // Extraire finalMatches (nouveau format avec data, ou ancien format direct)
  let finalMatches: (NewFinalMatch | FinalMatch)[] = [];
  if (finalSelection?.name === "FINAL_SELECTION") {
    if (hasDataWrapper<FinalSelectionData>(finalSelection)) {
      // Nouveau format: data.finalMatches
      finalMatches = finalSelection.data.finalMatches ?? [];
    } else {
      // Ancien format: finalMatches direct
      finalMatches = finalSelection.finalMatches ?? [];
    }
  }

  // Extraire groupsExpired (nouveau format LOAD_AND_EXPIRATION.data.expiredDetails, ou ancien EXPIRATION.groupsExpired)
  let groupsExpired: import("@/types/api").ExpiredGroup[] = [];
  if (loadAndExpiration?.name === "LOAD_AND_EXPIRATION") {
    if (hasDataWrapper<LoadAndExpirationData>(loadAndExpiration)) {
      groupsExpired = loadAndExpiration.data.expiredDetails ?? [];
    }
  } else if (expiration?.name === "EXPIRATION") {
    // Legacy fallback
    groupsExpired = expiration.groupsExpired ?? [];
  }

  // Le backend est la source de vérité unique - on utilise directement son summary

  // Transformer matches (détection automatique du format)
  const createdMatches: CreatedMatchViewModel[] = finalMatches.map((m) => {
    // Déterminer si c'est le nouveau format (NewFinalMatch) ou l'ancien (FinalMatch)
    const isNewFormat = "bucketId" in m && "slotStart" in m;

    if (isNewFormat) {
      // Nouveau format
      const match = m as NewFinalMatch;
      const matchId = generateMatchId(match);

      return {
        matchId,
        team1: match.team1.map((p) => ({
          name: p.name,
          pmr: p.pmr,
          playerId: p.publicId,
        })),
        team2: match.team2.map((p) => ({
          name: p.name,
          pmr: p.pmr,
          playerId: p.publicId,
        })),
        club: match.club ?? "Unknown",
        slot: {
          start: safeParseDate(match.slotStart),
          end: safeParseDate(match.slotEnd),
          // Note: pas de courtId dans le nouveau format
        },
        stats: {
          avgTeam1: match.avgTeam1 ?? 0,
          avgTeam2: match.avgTeam2 ?? 0,
          quality: match.quality ?? 0,
          score: match.score ?? 0,
        },
        captain: match.captain ?? "Unknown",
        status: "CONFIRMED", // Valeur par défaut (pas dans le nouveau format)
        sourceGroups: match.sourceGroups ?? [],
      };
    } else {
      // Ancien format (legacy)
      const match = m as FinalMatch;

      return {
        matchId: match.matchPublicId ?? "unknown",
        team1: match.team1 ?? [],
        team2: match.team2 ?? [],
        club: match.club ?? "Unknown",
        slot: {
          start: safeParseDate(match.slot?.start),
          end: safeParseDate(match.slot?.end),
          courtId: match.slot?.courtId ?? "unknown",
        },
        stats: {
          avgTeam1: match.avgTeam1 ?? 0,
          avgTeam2: match.avgTeam2 ?? 0,
          quality: match.quality ?? 0,
          score: match.score ?? 0,
        },
        captain: match.captain ?? "Unknown",
        status: match.status ?? "UNKNOWN",
        sourceGroups: match.sourceGroups ?? [],
      };
    }
  });

  // Transformer unmatched groups
  const unmatchedGroups: UnmatchedGroupViewModel[] = (
    report.unmatchedGroups ?? []
  ).map((g) => ({
    publicId: g.publicId ?? "unknown",
    type: g.type ?? "UNKNOWN",
    players: g.players ?? [],
    timeWindow: {
      start: safeParseDate(g.timeWindow?.start),
      end: safeParseDate(g.timeWindow?.end),
    },
    clubs: g.clubs ?? [],
    reason: g.reason ?? "Unknown reason",
  }));

  // Transformer expired groups (minimaliste)
  const expiredGroups: ExpiredGroupViewModel[] = groupsExpired.map((g) => ({
    publicId: g.publicId ?? "unknown",
    type: g.type ?? "UNKNOWN",
    creator: g.creator ?? "Unknown",
    timeWindowEnd: safeParseDate(g.timeWindowEnd),
    reason: g.reason ?? "Unknown reason",
  }));

  return {
    meta: {
      runId: report.runId ?? "unknown",
      executionTime: safeParseDate(report.executionTime),
      durationMs: report.durationMs ?? 0,
    },
    summary: report.summary ?? {
      groupsProcessed: 0,
      matchesCreated: 0,
      playersMatched: 0,
      playersUnmatched: 0,
      groupsExpired: 0,
    },
    createdMatches,
    unmatchedGroups,
    expiredGroups,
  };
}

/**
 * Extrait les informations de debug pour un match spécifique
 * LAZY : appelé uniquement quand l'accordion est ouvert
 * Retourne `null` si le payload est "lite" (pas de details/candidates/checks disponibles)
 * @param matchId - ID du match
 * @param phases - Toutes les phases du rapport
 */
export function extractDebugInfoForMatch(
  matchId: string,
  phases: MatchingPhase[]
): MatchDebugInfo | null {
  if (!phases || phases.length === 0) {
    return null;
  }

  // Vérifier si c'est un payload "lite" (nouveau format sans détails debug)
  // Les phases HETERO_MATCHING et HOMO_MATCHING en format "lite" n'ont pas de details/candidates/checks
  const heteroMatching = phases.find((p) => p.name === "HETERO_MATCHING");
  const homoMatching = phases.find((p) => p.name === "HOMO_MATCHING");

  const isLitePayload =
    (heteroMatching &&
      hasDataWrapper<HeteroMatchingData>(heteroMatching) &&
      !("details" in heteroMatching)) ||
    (homoMatching &&
      hasDataWrapper<HomoMatchingData>(homoMatching) &&
      !("details" in homoMatching));

  if (isLitePayload) {
    // Payload lite détecté : pas de debug disponible
    return null;
  }

  // Trouver le match dans FINAL_SELECTION
  const finalSelection = phases.find((p) => p.name === "FINAL_SELECTION");
  if (finalSelection?.name !== "FINAL_SELECTION") {
    return null;
  }

  // Extraire le match (supporte nouveau et ancien format)
  let match: NewFinalMatch | FinalMatch | undefined;
  let sourceGroupIds: string[] = [];

  if (hasDataWrapper<FinalSelectionData>(finalSelection)) {
    // Nouveau format
    match = finalSelection.data.finalMatches?.find((m) => {
      const id = generateMatchId(m);
      return id === matchId;
    });
    sourceGroupIds = (match as NewFinalMatch)?.sourceGroups?.map((sg) => sg.publicId) ?? [];
  } else {
    // Ancien format
    match = finalSelection.finalMatches?.find((m) => m.matchPublicId === matchId);
    sourceGroupIds = match?.sourceGroups?.map((sg) => sg.publicId) ?? [];
  }

  if (!match) {
    return null;
  }

  // Trouver le bucket concerné
  const bucketInfo = findBucketForMatch(sourceGroupIds, phases);

  // Trouver les candidats et checks
  const candidatesInfo = findCandidatesForMatch(matchId, phases);

  // Trouver la validation slot
  const slotValidationInfo = findSlotValidationForMatch(matchId, phases);

  // Construire le debug info
  return {
    bucket: bucketInfo ?? {
      bucketId: "unknown",
      club: "Unknown",
      start: "Unknown",
      anchor: false,
      kept: true,
      reason: "No bucket info available",
    },
    candidates: candidatesInfo.candidates,
    checks: candidatesInfo.checks,
    slotValidation: slotValidationInfo ?? {
      skipValidation: false,
      reason: "No slot validation info",
      compatibleSlots: [],
    },
    processingLogs: candidatesInfo.processingLogs,
    rejections: candidatesInfo.rejections,
  };
}

/**
 * Extrait les informations de debug pour un groupe non matché
 * LAZY : appelé uniquement quand l'accordion est ouvert
 * Retourne des arrays vides si payload "lite" (pas de détails disponibles)
 * @param groupId - ID du groupe
 * @param phases - Toutes les phases du rapport
 */
export function extractDebugInfoForUnmatchedGroup(
  groupId: string,
  phases: MatchingPhase[]
): {
  bucketsConsidered: BucketDebugInfo[];
  rejections: Rejection[];
} {
  const bucketsConsidered: BucketDebugInfo[] = [];
  const rejections: Rejection[] = [];

  // Chercher dans BUCKET_ENRICHMENT pour voir quels buckets ont considéré ce groupe
  const enrichment = phases.find((p) => p.name === "BUCKET_ENRICHMENT");
  if (enrichment?.name === "BUCKET_ENRICHMENT") {
    // Supporte nouveau format (data.details) et ancien format (details direct)
    let details: import("@/types/api").BucketEnrichmentDetail[] | undefined;

    if (hasDataWrapper<BucketEnrichmentData>(enrichment)) {
      details = enrichment.data.details;
    } else if ("details" in enrichment) {
      details = enrichment.details;
    }

    details?.forEach((detail) => {
      const hasGroup = detail.eligibleGroups?.some(
        (g: { publicId?: string }) => g.publicId === groupId
      );
      if (hasGroup) {
        bucketsConsidered.push({
          bucketId: detail.bucketId ?? "unknown",
          club: detail.club ?? "Unknown",
          start: detail.start ?? "Unknown",
          anchor: detail.anchor ?? false,
          kept: detail.kept ?? false,
          reason: detail.reason ?? "Unknown",
        });
      }
    });
  }

  // Chercher dans les phases de matching pour les rejections
  // Nouveau format: HOMO_MATCHING (unifié)
  // Ancien format: HOMO_MATCHING_ANCHORED + HOMO_MATCHING_VIRTUAL
  const matchingPhases = phases.filter(
    (p) =>
      p.name === "HETERO_MATCHING" ||
      p.name === "HOMO_MATCHING" ||
      p.name === "HOMO_MATCHING_ANCHORED" ||
      p.name === "HOMO_MATCHING_VIRTUAL"
  );

  matchingPhases.forEach((phase) => {
    if (
      phase.name === "HETERO_MATCHING" ||
      phase.name === "HOMO_MATCHING" ||
      phase.name === "HOMO_MATCHING_ANCHORED" ||
      phase.name === "HOMO_MATCHING_VIRTUAL"
    ) {
      // Note: Le nouveau format "lite" n'a pas de details/rejections
      // On vérifie la présence de details avant d'y accéder
      if ("details" in phase && Array.isArray(phase.details)) {
        phase.details.forEach((detail) => {
          detail.rejections?.forEach((rejection) => {
            if (rejection.groupsAffected?.includes(groupId)) {
              rejections.push(rejection);
            }
          });
        });
      }
    }
  });

  return {
    bucketsConsidered,
    rejections,
  };
}

// ============================================================================
// Helper functions
// ============================================================================

function safeParseDate(dateString: string | undefined | null): Date {
  if (!dateString) {
    return new Date(0); // Epoch par défaut
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date(0) : date;
}

function findBucketForMatch(
  sourceGroupIds: string[],
  phases: MatchingPhase[]
): BucketDebugInfo | null {
  // Chercher dans BUCKET_ENRICHMENT
  const enrichment = phases.find((p) => p.name === "BUCKET_ENRICHMENT");
  if (enrichment?.name !== "BUCKET_ENRICHMENT") {
    return null;
  }

  // Extraire details (supporte nouveau format avec data et ancien format)
  let details: import("@/types/api").BucketEnrichmentDetail[] | undefined;
  if (hasDataWrapper<BucketEnrichmentData>(enrichment)) {
    details = enrichment.data.details;
  } else if ("details" in enrichment) {
    details = enrichment.details;
  }

  // Trouver le bucket qui contient au moins un des groupes sources
  const bucketDetail = details?.find((detail) =>
    detail.eligibleGroups?.some((g: { publicId?: string }) =>
      sourceGroupIds.includes(g.publicId ?? "")
    )
  );

  if (!bucketDetail) {
    return null;
  }

  // Chercher la reservation dans BUCKET_GENERATION si bucket ancré
  let reservedBy: BucketDebugInfo["reservedBy"] = undefined;
  if (bucketDetail.anchor) {
    const generation = phases.find((p) => p.name === "BUCKET_GENERATION");
    if (generation?.name === "BUCKET_GENERATION") {
      // Extraire buckets (supporte nouveau format avec data et ancien format)
      let buckets: import("@/types/api").BucketGeneration[] | undefined;
      if (hasDataWrapper(generation)) {
        buckets = generation.data.buckets;
      } else if ("buckets" in generation) {
        buckets = generation.buckets;
      }

      const generatedBucket = buckets?.find(
        (b: import("@/types/api").BucketGeneration) => b.id === bucketDetail.bucketId && b.reservedBy
      );
      if (generatedBucket?.reservedBy) {
        reservedBy = generatedBucket.reservedBy;
      }
    }
  }

  return {
    bucketId: bucketDetail.bucketId ?? "unknown",
    club: bucketDetail.club ?? "Unknown",
    start: bucketDetail.start ?? "Unknown",
    anchor: bucketDetail.anchor ?? false,
    kept: bucketDetail.kept ?? false,
    reason: bucketDetail.reason ?? "Unknown",
    reservedBy,
  };
}

function findCandidatesForMatch(
  matchId: string,
  phases: MatchingPhase[]
): {
  candidates: CandidateDebugInfo[];
  checks: CheckDebugInfo[];
  processingLogs: ProcessingLog[];
  rejections: Rejection[];
} {
  const candidates: CandidateDebugInfo[] = [];
  const checks: CheckDebugInfo[] = [];
  const processingLogs: ProcessingLog[] = [];
  const rejections: Rejection[] = [];

  // Chercher dans toutes les phases de matching
  // Nouveau format: HOMO_MATCHING (unifié)
  // Ancien format: HOMO_MATCHING_ANCHORED + HOMO_MATCHING_VIRTUAL
  const matchingPhases = phases.filter(
    (p) =>
      p.name === "HETERO_MATCHING" ||
      p.name === "HOMO_MATCHING" ||
      p.name === "HOMO_MATCHING_ANCHORED" ||
      p.name === "HOMO_MATCHING_VIRTUAL"
  );

  matchingPhases.forEach((phase) => {
    if (
      phase.name === "HETERO_MATCHING" ||
      phase.name === "HOMO_MATCHING" ||
      phase.name === "HOMO_MATCHING_ANCHORED" ||
      phase.name === "HOMO_MATCHING_VIRTUAL"
    ) {
      // Note: Le nouveau format "lite" n'a pas de details
      // On vérifie la présence de details avant d'y accéder
      if ("details" in phase && Array.isArray(phase.details)) {
        phase.details.forEach((detail) => {
          // Chercher le candidat qui correspond à ce match
          detail.candidates?.forEach((candidate) => {
            // On ne peut pas faire de correspondance directe matchId <-> candidateId
            // donc on prend tous les candidats du bucket pour info
            candidates.push({
              candidateId: candidate.id ?? "unknown",
              team1: candidate.team1 ?? [],
              team2: candidate.team2 ?? [],
              avgTeam1: candidate.avgTeam1 ?? 0,
              avgTeam2: candidate.avgTeam2 ?? 0,
              quality: candidate.quality ?? 0,
              score: candidate.score ?? 0,
              selected: candidate.selected ?? false,
              rejectionReason: candidate.rejectionReason,
            });
          });

          // Extraire les checks depuis processingLog
          detail.processingLog?.forEach((log) => {
            processingLogs.push(log);
            if (log.checks) {
              Object.entries(log.checks).forEach(([name, details]) => {
                checks.push({ name, details });
              });
            }
          });

          // Ajouter les rejections
          if (detail.rejections) {
            rejections.push(...detail.rejections);
          }
        });
      }
    }
  });

  return {
    candidates,
    checks,
    processingLogs,
    rejections,
  };
}

function findSlotValidationForMatch(
  matchId: string,
  phases: MatchingPhase[]
): SlotValidationDebugInfo | null {
  const slotValidation = phases.find((p) => p.name === "SLOT_VALIDATION");
  if (slotValidation?.name !== "SLOT_VALIDATION") {
    return null;
  }

  // Extraire details (supporte nouveau format avec data et ancien format)
  // Note: Le nouveau format lite a une structure différente (pas de candidateId, pas de compatibleSlots détaillés)
  if (hasDataWrapper(slotValidation)) {
    // Nouveau format: data.details avec structure simplifiée
    // Structure: { bucketId, isAnchored, compatibleSlotsFound }
    // Pas exploitable pour debug par match spécifique
    return {
      skipValidation: false,
      reason: "Payload lite - détails par bucket uniquement",
      compatibleSlots: [],
    };
  }

  // Ancien format: details avec structure complète
  // Trouver le détail correspondant au match
  // Note : on ne peut pas faire de correspondance directe matchId <-> candidateId
  // donc on prend le premier détail pour l'instant (à améliorer si besoin)
  const detail = slotValidation.details?.[0];
  if (!detail) {
    return null;
  }

  return {
    skipValidation: detail.skipValidation ?? false,
    reason: detail.reason ?? "Unknown",
    compatibleSlots: detail.compatibleSlots ?? [],
  };
}

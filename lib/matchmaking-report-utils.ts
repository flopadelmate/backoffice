import type {
  MatchmakingReport,
  ReportViewModel,
  CreatedMatchViewModel,
  UnmatchedGroupViewModel,
  ExpiredGroupViewModel,
  ReportCounts,
  MatchDebugInfo,
  BucketDebugInfo,
  CandidateDebugInfo,
  CheckDebugInfo,
  SlotValidationDebugInfo,
  MatchingPhase,
  FinalMatch,
  ProcessingLog,
  Rejection,
} from "@/types/api";

/**
 * Transforme le rapport brut en ViewModel optimisé pour l'UI
 * 100% défensif : tolère phases absentes, champs optionnels, arrays vides
 * @param report - Rapport brut de l'API
 */
export function transformReportToViewModel(
  report: MatchmakingReport
): ReportViewModel {
  // Extraire phases avec defaults
  const finalSelection = report.phases?.find((p) => p.name === "FINAL_SELECTION");
  const expiration = report.phases?.find((p) => p.name === "EXPIRATION");

  const finalMatches =
    finalSelection?.name === "FINAL_SELECTION"
      ? finalSelection.finalMatches ?? []
      : [];
  const groupsExpired =
    expiration?.name === "EXPIRATION" ? expiration.groupsExpired ?? [] : [];

  // Calculer les compteurs réels (source of truth)
  const matchesCreated = finalMatches.length;
  const playersMatched = finalMatches.reduce(
    (sum, m) =>
      sum +
      (m.team1?.length ?? 0) +
      (m.team2?.length ?? 0),
    0
  );
  const unmatchedGroupsCount = report.unmatchedGroups?.length ?? 0;
  const playersUnmatched = (report.unmatchedGroups ?? []).reduce(
    (sum, g) => sum + (g.players?.length ?? 0),
    0
  );
  const expiredGroupsCount = groupsExpired.length;

  // Counts calculés
  const counts: ReportCounts = {
    matchesCreated,
    playersMatched,
    unmatchedGroups: unmatchedGroupsCount,
    playersUnmatched,
    expiredGroups: expiredGroupsCount,
    groupsProcessed: report.summary?.groupsProcessed ?? 0,
  };

  // Détecter divergence avec summary (défensif)
  const hasSummaryDivergence =
    (report.summary?.matchesCreated ?? 0) !== matchesCreated ||
    (report.summary?.playersMatched ?? 0) !== playersMatched ||
    (report.summary?.playersUnmatched ?? 0) !== playersUnmatched ||
    (report.summary?.groupsExpired ?? 0) !== expiredGroupsCount;

  // Transformer matches
  const createdMatches: CreatedMatchViewModel[] = finalMatches.map((m) => ({
    matchId: m.matchPublicId ?? "unknown",
    team1: m.team1 ?? [],
    team2: m.team2 ?? [],
    club: m.club ?? "Unknown",
    slot: {
      start: safeParseDate(m.slot?.start),
      end: safeParseDate(m.slot?.end),
      courtId: m.slot?.courtId ?? "unknown",
    },
    stats: {
      avgTeam1: m.avgTeam1 ?? 0,
      avgTeam2: m.avgTeam2 ?? 0,
      quality: m.quality ?? 0,
      score: m.score ?? 0,
    },
    captain: m.captain ?? "Unknown",
    status: m.status ?? "UNKNOWN",
    sourceGroups: m.sourceGroups ?? [],
  }));

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
    counts,
    summaryFromBackend: report.summary ?? {
      groupsProcessed: 0,
      matchesCreated: 0,
      playersMatched: 0,
      playersUnmatched: 0,
      groupsExpired: 0,
    },
    hasSummaryDivergence,
    createdMatches,
    unmatchedGroups,
    expiredGroups,
  };
}

/**
 * Extrait les informations de debug pour un match spécifique
 * LAZY : appelé uniquement quand l'accordion est ouvert
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

  // Trouver le match dans FINAL_SELECTION
  const finalSelection = phases.find((p) => p.name === "FINAL_SELECTION");
  if (finalSelection?.name !== "FINAL_SELECTION") {
    return null;
  }

  const match = finalSelection.finalMatches?.find(
    (m) => m.matchPublicId === matchId
  );
  if (!match) {
    return null;
  }

  // Extraire les sourceGroups IDs
  const sourceGroupIds = match.sourceGroups?.map((sg) => sg.publicId) ?? [];

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
    enrichment.details?.forEach((detail) => {
      const hasGroup = detail.eligibleGroups?.some(
        (g) => g.publicId === groupId
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
  const matchingPhases = phases.filter(
    (p) =>
      p.name === "HETERO_MATCHING" ||
      p.name === "HOMO_MATCHING_ANCHORED" ||
      p.name === "HOMO_MATCHING_VIRTUAL"
  );

  matchingPhases.forEach((phase) => {
    if (
      phase.name === "HETERO_MATCHING" ||
      phase.name === "HOMO_MATCHING_ANCHORED" ||
      phase.name === "HOMO_MATCHING_VIRTUAL"
    ) {
      phase.details?.forEach((detail) => {
        detail.rejections?.forEach((rejection) => {
          if (rejection.groupsAffected?.includes(groupId)) {
            rejections.push(rejection);
          }
        });
      });
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

  // Trouver le bucket qui contient au moins un des groupes sources
  const bucketDetail = enrichment.details?.find((detail) =>
    detail.eligibleGroups?.some((g) =>
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
      const generatedBucket = generation.buckets?.find(
        (b) => b.id === bucketDetail.bucketId && b.reservedBy
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
  const matchingPhases = phases.filter(
    (p) =>
      p.name === "HETERO_MATCHING" ||
      p.name === "HOMO_MATCHING_ANCHORED" ||
      p.name === "HOMO_MATCHING_VIRTUAL"
  );

  matchingPhases.forEach((phase) => {
    if (
      phase.name === "HETERO_MATCHING" ||
      phase.name === "HOMO_MATCHING_ANCHORED" ||
      phase.name === "HOMO_MATCHING_VIRTUAL"
    ) {
      phase.details?.forEach((detail) => {
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

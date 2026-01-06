/**
 * PMR (Player Match Rating) Calculator
 *
 * Bayesian-inspired algorithm to compute player skill level from questionnaire responses.
 * Uses soft evidence (mu, tau, weight) with optional hard caps for strict constraints.
 *
 * NOTE: This version uses a Gaussian-like (L2) scoring in LOG SPACE to:
 * - Avoid numeric underflow (scores can get extremely small)
 * - Increase sensitivity so the winner can land between mu values (e.g. 4.3)
 */

import { addOptionalNumber } from "@/lib/api-params-helpers";

// ============================================================================
// TYPES
// ============================================================================

export type Evidence = {
  mu: number;          // Expected level for this answer
  tau: number;         // Tolerance (sigma-like). Higher = more permissive.
  weight: number;      // Relative importance (1.0 = baseline)
  hardMax?: number;    // Strict upper bound (level > hardMax => forbidden)
  hardMin?: number;    // Strict lower bound (level < hardMin => forbidden)
};

export type AnswerQ1 =
  | "debutant"
  | "debutant-avance"
  | "loisir-regulier"
  | "intermediaire"
  | "confirme"
  | "avance"
  | "expert"
  | "elite";

export type AnswerQ2 = "moins-1an" | "1-3ans" | "3-6ans" | "6-10ans" | "plus-10ans";

export type AnswerQ3 = "loisir" | "debut-competition" | "competiteur-regulier" | "competiteur-avance";

export type AnswerQ4 = "1" | "2" | "3" | "4" | "5";

export type AnswerQ5 = "1" | "2" | "3" | "4" | "5";

export type QuestionDebugScore = {
  questionId: string;
  answer: string;
  mu: number;
  tau: number;
  weight: number;
  hardMin?: number;
  hardMax?: number;

  // Base score at winner (unweighted), mapped back to (0..1]
  scoreAtWinnerBase: number;

  // Effective score used in combined likelihood (baseScore ^ weight)
  scoreAtWinnerWeighted: number;
};

export type CandidateLevel = {
  level: number;    // PMR value (0.1 to 8.9)
  score: number;    // Normalized score in (0..1], relative to best
  logScore: number; // Raw combined log-score (<= 0, or -Infinity if forbidden)
};

export type PmrResult = {
  pmr: number;                        // Final PMR (0.1 to 8.9)
  debugScores: QuestionDebugScore[];  // Per-question debug info
};

// ============================================================================
// CONSTANTS
// ============================================================================

// Levels as integers 1..89 to avoid float precision issues
// Represents PMR 0.1 to 8.9 in steps of 0.1
const LEVELS_INT = Array.from({ length: 89 }, (_, i) => i + 1);

// Default fallback = 4.0
const DEFAULT_LEVEL_INT = 40;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Gaussian-like log scoring (L2 penalty):
 * logScore = -(d^2) / (2*sigma^2)
 *
 * - sigma is tau here (must be > 0)
 * - returns 0 when level == mu
 * - returns negative values as level moves away from mu
 */
function logScoreDistanceGaussian(level: number, mu: number, tau: number): number {
  const sigma = Math.max(tau, 1e-6);
  const d = level - mu;
  return -(d * d) / (2 * sigma * sigma);
}

function isForbidden(level: number, e: Evidence): boolean {
  if (e.hardMin !== undefined && level < e.hardMin) return true;
  if (e.hardMax !== undefined && level > e.hardMax) return true;
  return false;
}

/**
 * Core algorithm: find the level with highest combined log-likelihood.
 * Returns all candidates with their raw logScore and a normalized score in (0..1].
 */
function pickPMR(evidences: Evidence[]): {
  winnerLevel: number;
  winnerLogScore: number;
  allScores: CandidateLevel[];
} {
  // Tie-break target: average mu (helps in rare cases of identical logScore)
  const avgMu =
    evidences.length > 0
      ? evidences.reduce((acc, e) => acc + e.mu, 0) / evidences.length
      : DEFAULT_LEVEL_INT / 10;

  const targetLevelInt = clamp(Math.round(avgMu * 10), 1, 89);

  let bestLevelInt = DEFAULT_LEVEL_INT;
  let bestLogScore = -Infinity;

  const raw: Array<{ levelInt: number; level: number; logScore: number }> = [];

  for (const levelInt of LEVELS_INT) {
    const level = levelInt / 10;
    let logCombined = 0;

    for (const e of evidences) {
      if (isForbidden(level, e)) {
        logCombined = -Infinity;
        break;
      }
      logCombined += e.weight * logScoreDistanceGaussian(level, e.mu, e.tau);
    }

    raw.push({ levelInt, level, logScore: logCombined });

    if (logCombined > bestLogScore) {
      bestLogScore = logCombined;
      bestLevelInt = levelInt;
    } else if (logCombined === bestLogScore) {
      // Tie-break: closest to target mu average, then closest to default, then lower
      const currentDist = Math.abs(levelInt - targetLevelInt);
      const bestDist = Math.abs(bestLevelInt - targetLevelInt);
      if (currentDist < bestDist) {
        bestLevelInt = levelInt;
      } else if (currentDist === bestDist) {
        const currentDef = Math.abs(levelInt - DEFAULT_LEVEL_INT);
        const bestDef = Math.abs(bestLevelInt - DEFAULT_LEVEL_INT);
        if (currentDef < bestDef) bestLevelInt = levelInt;
        else if (currentDef === bestDef && levelInt < bestLevelInt) bestLevelInt = levelInt;
      }
    }
  }

  // Convert to normalized scores for display:
  // score = exp(logScore - bestLogScore) in (0..1]
  const allScores: CandidateLevel[] = raw.map((x) => {
    if (x.logScore === -Infinity || bestLogScore === -Infinity) {
      return { level: x.level, logScore: x.logScore, score: 0 };
    }
    return { level: x.level, logScore: x.logScore, score: Math.exp(x.logScore - bestLogScore) };
  });

  return {
    winnerLevel: bestLevelInt / 10,
    winnerLogScore: bestLogScore,
    allScores,
  };
}

// ============================================================================
// EVIDENCE FUNCTIONS (per question)
// ============================================================================

/**
 * Q1: Auto-evaluation (1-8 scale)
 * Permissive tau due to self-assessment bias
 */
function evidenceQ1(answer: AnswerQ1): Evidence {
  const map: Record<AnswerQ1, number> = {
    "debutant": 1,
    "debutant-avance": 2,
    "loisir-regulier": 3,
    "intermediaire": 4,
    "confirme": 5,
    "avance": 6,
    "expert": 7,
    "elite": 8,
  };
  const level = map[answer];
  return {
    mu: clamp(level, 1, 8),
    tau: 1.2,
    weight: 2.0,
  };
}

/**
 * Q2: Experience (years of racket sports)
 * Hard caps to prevent impossible levels
 *
 * NOTE: These values were adjusted so "lowest answers everywhere" yields ~1.0.
 */
function evidenceQ2(answer: AnswerQ2): Evidence {
  const map: Record<AnswerQ2, Evidence> = {
    // Experience acts more as an upper bound than as a booster. We reduce weights so that
    // simply playing for many years doesn’t inflate low-level players too much. Hard caps
    // remain the same to prevent impossible levels.
    "moins-1an":  { mu: 1.5, tau: 2.0, weight: 0.7, hardMax: 4.0 },
    "1-3ans":     { mu: 2.8, tau: 1.5, weight: 0.7, hardMax: 5.5 },
    "3-6ans":     { mu: 3.5, tau: 1.2, weight: 0.7, hardMax: 6.5 },
    "6-10ans":    { mu: 3.8, tau: 1.3, weight: 0.5 },
    "plus-10ans": { mu: 4.0, tau: 1.5, weight: 0.4 },
  };
  return map[answer];
}

/**
 * Q3: Competition level
 * Soft evidence only (players often confuse P100/P250)
 */
function evidenceQ3(answer: AnswerQ3): Evidence {
  const map: Record<AnswerQ3, Evidence> = {
    // Make “loisir” nearly neutral: raise mu and keep high tau with very low weight
    "loisir":                { mu: 2.0, tau: 3.0, weight: 0.2 },
    // Competition participants: reduce weight and increase tau to avoid a single high
    // competition answer from overpowering other low answers.
    "debut-competition":     { mu: 4.0, tau: 1.2, weight: 0.8 },
    "competiteur-regulier":  { mu: 5.5, tau: 1.0, weight: 0.9 },
    "competiteur-avance":    { mu: 7.5, tau: 0.9, weight: 0.9 },
  };
  return map[answer];
}

/**
 * Q4: Volée (net play quality)
 * Soft evidence (key skill marker)
 */
function evidenceQ4(answer: AnswerQ4): Evidence {
  const map: Record<AnswerQ4, Evidence> = {
    // Softer evidence for high volley skill to avoid single high answer dominating
    "1": { mu: 1.1, tau: 1.3, weight: 0.8, hardMax: 3.0 },
    "2": { mu: 2.5, tau: 1.3, weight: 0.8, hardMax: 4.0 },
    "3": { mu: 3.8, tau: 1.4, weight: 0.9, hardMax: 5.0 },
    "4": { mu: 5.0, tau: 1.7, weight: 1.0 },
    "5": { mu: 6.0, tau: 1.8, weight: 1.0 },
  };
  return map[answer];
}

/**
 * Q5: Rebonds (wall play / tactical reading)
 * Soft evidence, marker of tactical experience
 */
function evidenceQ5(answer: AnswerQ5): Evidence {
  const map: Record<AnswerQ5, Evidence> = {
    // Similar adjustments to Q4: soften high rebound skill effects
    "1": { mu: 1.0, tau: 1.3, weight: 0.8, hardMax: 3.0 },
    "2": { mu: 2.5, tau: 1.3, weight: 0.8, hardMax: 4.0 },
    "3": { mu: 3.8, tau: 1.4, weight: 0.9, hardMax: 5.0 },
    "4": { mu: 5.0, tau: 1.7, weight: 1.0 },
    "5": { mu: 6.0, tau: 1.8, weight: 1.0 },
  };
  return map[answer];
}

// ============================================================================
// MAIN COMPUTATION
// ============================================================================

export function computePMR(params: {
  q1: AnswerQ1;
  q2: AnswerQ2;
  q3: AnswerQ3;
  q4: AnswerQ4;
  q5: AnswerQ5;
}): PmrResult {
  const e1 = evidenceQ1(params.q1);
  const e2 = evidenceQ2(params.q2);
  const e3 = evidenceQ3(params.q3);
  const e4 = evidenceQ4(params.q4);
  const e5 = evidenceQ5(params.q5);

  const evidences = [e1, e2, e3, e4, e5];

  const { winnerLevel, winnerLogScore } = pickPMR(evidences);

  // Debug: base & weighted score at winner
  function makeDebug(questionId: string, answer: string, e: Evidence): QuestionDebugScore {
    if (isForbidden(winnerLevel, e)) {
      let debug: QuestionDebugScore = {
        questionId,
        answer,
        mu: e.mu,
        tau: e.tau,
        weight: e.weight,
        scoreAtWinnerBase: 0,
        scoreAtWinnerWeighted: 0,
      };
      debug = addOptionalNumber(debug, "hardMin", e.hardMin);
      debug = addOptionalNumber(debug, "hardMax", e.hardMax);
      return debug;
    }

    const logBase = logScoreDistanceGaussian(winnerLevel, e.mu, e.tau);
    const base = Math.exp(logBase);                 // (0..1]
    const weighted = Math.exp(e.weight * logBase);  // (0..1]

    let entry: QuestionDebugScore = {
      questionId,
      answer,
      mu: e.mu,
      tau: e.tau,
      weight: e.weight,
      scoreAtWinnerBase: base,
      scoreAtWinnerWeighted: weighted,
    };
    entry = addOptionalNumber(entry, "hardMin", e.hardMin);
    entry = addOptionalNumber(entry, "hardMax", e.hardMax);
    return entry;
  }

  const debugScores: QuestionDebugScore[] = [
    makeDebug("Q1", params.q1, e1),
    makeDebug("Q2", params.q2, e2),
    makeDebug("Q3", params.q3, e3),
    makeDebug("Q4", params.q4, e4),
    makeDebug("Q5", params.q5, e5),
  ];

  // winnerLogScore kept for potential logging; not exposed in PmrResult by default
  void winnerLogScore;

  return {
    pmr: winnerLevel,
    debugScores,
  };
}
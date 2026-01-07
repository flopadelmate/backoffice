type PlayerId = string;

export type PostMatchPlayerInput = {
  id: PlayerId;
  pmr: number; // 0.1..8.9
  reliability: number; // 0..100
};

export type MatchSetInput = {
  team1Games: number | null; // null/null = set non joué
  team2Games: number | null;
};

export type PmrReliabilityParams = {
  // PMR update (Elo + margin + upset)
  K: number;
  eloScale: number;
  marginMin: number;
  marginGamma: number;
  upsetBeta: number;
  upsetGamma: number;

  // Clamp PMR
  pmrMin: number;
  pmrMax: number;

  // Reliability -> volatility multiplier
  Vmax: number;   // V(0) = Vmax
  vGamma: number; // courbe V(R)

  // Reliability progression curve: R(n) = 100*(1-exp(-n/tau))^g
  relTau: number;
  relCurveGamma: number;

  // Clamp reliability
  relMin: number; // 0
  relMax: number; // 100
};

export type PostMatchResult = {
  playerId: PlayerId;

  previousPmr: number;
  newPmr: number;
  delta: number;

  previousReliability: number;
  newReliability: number;
  deltaReliability: number;
};

export type ComputePmrAfterMatchInput = {
  team1: [PostMatchPlayerInput, PostMatchPlayerInput]; // A,B
  team2: [PostMatchPlayerInput, PostMatchPlayerInput]; // C,D
  sets: [MatchSetInput, MatchSetInput, MatchSetInput?]; // best-of-3
  params?: Partial<PmrReliabilityParams>;
};

const DEFAULT_PARAMS: PmrReliabilityParams = {
  // Base algo (inchangé)
  K: 0.25,
  eloScale: 1.25,
  marginMin: 0.25,
  marginGamma: 1.3,
  upsetBeta: 0.8,
  upsetGamma: 1.2,

  pmrMin: 0.1,
  pmrMax: 8.9,

  // Reliability -> amplitude
  Vmax: 3.0,
  vGamma: 1.2,

  // Reliability progression targets (~24% @5, ~55% @30, ~85% @100)
  relTau: 77,
  relCurveGamma: 0.52,

  relMin: 0,
  relMax: 100,
};

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

function pow(x: number, p: number): number {
  return Math.pow(x, p);
}

function expectedWinProb(team1Pmr: number, team2Pmr: number, eloScale: number): number {
  const d = team1Pmr - team2Pmr;
  return 1 / (1 + pow(10, -d / eloScale));
}

function parsePlayedSets(sets: Array<MatchSetInput | undefined>): Array<{ g1: number; g2: number }> {
  const played: Array<{ g1: number; g2: number }> = [];
  for (const s of sets) {
    if (!s) continue;

    const { team1Games, team2Games } = s;

    if (team1Games === null && team2Games === null) continue;
    if (team1Games === null || team2Games === null) continue; // defensive

    played.push({ g1: team1Games, g2: team2Games });
  }
  return played;
}

function computeWinnerFromSets(playedSets: Array<{ g1: number; g2: number }>): 1 | 2 {
  let s1 = 0;
  let s2 = 0;

  for (const set of playedSets) {
    if (set.g1 > set.g2) s1 += 1;
    else s2 += 1;
  }
  return s1 > s2 ? 1 : 2;
}

// --- Reliability curve helpers ---

function reliabilityFromMatches(n: number, relTau: number, relCurveGamma: number): number {
  if (n <= 0) return 0;
  const base = 1 - Math.exp(-n / relTau); // in (0,1)
  return 100 * pow(base, relCurveGamma);
}

function matchesFromReliability(R: number, relTau: number, relCurveGamma: number): number {
  if (R <= 0) return 0;
  if (R >= 100) return Number.POSITIVE_INFINITY;

  const r01 = R / 100;
  const x = pow(r01, 1 / relCurveGamma); // x in (0,1)
  const oneMinusX = 1 - x;

  // numeric safety
  if (oneMinusX <= 0) return Number.POSITIVE_INFINITY;

  return -relTau * Math.log(oneMinusX);
}

function volatilityMultiplier(R: number, Vmax: number, vGamma: number): number {
  const r = clamp(R, 0, 100) / 100; // 0..1
  return 1 + (Vmax - 1) * pow(1 - r, vGamma);
}

function updateReliability(R: number, relTau: number, relCurveGamma: number): number {
  const n = matchesFromReliability(R, relTau, relCurveGamma);
  if (!Number.isFinite(n)) return 100; // already maxed

  const nNew = n + 1; // no weighting: each match counts as 1
  return reliabilityFromMatches(nNew, relTau, relCurveGamma);
}

export function computePmrAfterMatch(input: ComputePmrAfterMatchInput): PostMatchResult[] {
  const p: PmrReliabilityParams = { ...DEFAULT_PARAMS, ...(input.params ?? {}) };

  const t1 = input.team1;
  const t2 = input.team2;

  const pmrA = clamp(t1[0].pmr, p.pmrMin, p.pmrMax);
  const pmrB = clamp(t1[1].pmr, p.pmrMin, p.pmrMax);
  const pmrC = clamp(t2[0].pmr, p.pmrMin, p.pmrMax);
  const pmrD = clamp(t2[1].pmr, p.pmrMin, p.pmrMax);

  const relA = clamp(t1[0].reliability, p.relMin, p.relMax);
  const relB = clamp(t1[1].reliability, p.relMin, p.relMax);
  const relC = clamp(t2[0].reliability, p.relMin, p.relMax);
  const relD = clamp(t2[1].reliability, p.relMin, p.relMax);

  const team1Pmr = (pmrA + pmrB) / 2;
  const team2Pmr = (pmrC + pmrD) / 2;

  const playedSets = parsePlayedSets(input.sets);
  if (playedSets.length < 2) {
    // input devrait garantir set1+set2, mais on fail-safe
    return [
      {
        playerId: t1[0].id,
        previousPmr: pmrA,
        newPmr: pmrA,
        delta: 0,
        previousReliability: relA,
        newReliability: relA,
        deltaReliability: 0,
      },
      {
        playerId: t1[1].id,
        previousPmr: pmrB,
        newPmr: pmrB,
        delta: 0,
        previousReliability: relB,
        newReliability: relB,
        deltaReliability: 0,
      },
      {
        playerId: t2[0].id,
        previousPmr: pmrC,
        newPmr: pmrC,
        delta: 0,
        previousReliability: relC,
        newReliability: relC,
        deltaReliability: 0,
      },
      {
        playerId: t2[1].id,
        previousPmr: pmrD,
        newPmr: pmrD,
        delta: 0,
        previousReliability: relD,
        newReliability: relD,
        deltaReliability: 0,
      },
    ];
  }

  const winner = computeWinnerFromSets(playedSets); // 1 or 2

  let games1 = 0;
  let games2 = 0;
  for (const s of playedSets) {
    games1 += s.g1;
    games2 += s.g2;
  }

  const E1 = expectedWinProb(team1Pmr, team2Pmr, p.eloScale);
  const A1 = winner === 1 ? 1 : 0;

  const diffGames = Math.abs(games1 - games2);
  const totalGames = Math.max(1, games1 + games2);
  const m = diffGames / totalGames; // 0..1

  const Fmargin = p.marginMin + (1 - p.marginMin) * pow(m, p.marginGamma);

  const surprise = A1 === 1 ? (1 - E1) : E1;
  const Fupset = 1 + p.upsetBeta * pow(surprise, p.upsetGamma);

  const deltaBaseTeam1 = p.K * (A1 - E1) * Fmargin * Fupset;
  const deltaBaseTeam2 = -deltaBaseTeam1;

  // Reliability scaling (individual)
  const multA = volatilityMultiplier(relA, p.Vmax, p.vGamma);
  const multB = volatilityMultiplier(relB, p.Vmax, p.vGamma);
  const multC = volatilityMultiplier(relC, p.Vmax, p.vGamma);
  const multD = volatilityMultiplier(relD, p.Vmax, p.vGamma);

  const deltaA = deltaBaseTeam1 * multA;
  const deltaB = deltaBaseTeam1 * multB;
  const deltaC = deltaBaseTeam2 * multC;
  const deltaD = deltaBaseTeam2 * multD;

  const newA = clamp(pmrA + deltaA, p.pmrMin, p.pmrMax);
  const newB = clamp(pmrB + deltaB, p.pmrMin, p.pmrMax);
  const newC = clamp(pmrC + deltaC, p.pmrMin, p.pmrMax);
  const newD = clamp(pmrD + deltaD, p.pmrMin, p.pmrMax);

  // Reliability update: +1 match (no weighting)
  const relANew = clamp(updateReliability(relA, p.relTau, p.relCurveGamma), p.relMin, p.relMax);
  const relBNew = clamp(updateReliability(relB, p.relTau, p.relCurveGamma), p.relMin, p.relMax);
  const relCNew = clamp(updateReliability(relC, p.relTau, p.relCurveGamma), p.relMin, p.relMax);
  const relDNew = clamp(updateReliability(relD, p.relTau, p.relCurveGamma), p.relMin, p.relMax);

  return [
    {
      playerId: t1[0].id,
      previousPmr: pmrA,
      newPmr: newA,
      delta: newA - pmrA,
      previousReliability: relA,
      newReliability: relANew,
      deltaReliability: relANew - relA,
    },
    {
      playerId: t1[1].id,
      previousPmr: pmrB,
      newPmr: newB,
      delta: newB - pmrB,
      previousReliability: relB,
      newReliability: relBNew,
      deltaReliability: relBNew - relB,
    },
    {
      playerId: t2[0].id,
      previousPmr: pmrC,
      newPmr: newC,
      delta: newC - pmrC,
      previousReliability: relC,
      newReliability: relCNew,
      deltaReliability: relCNew - relC,
    },
    {
      playerId: t2[1].id,
      previousPmr: pmrD,
      newPmr: newD,
      delta: newD - pmrD,
      previousReliability: relD,
      newReliability: relDNew,
      deltaReliability: relDNew - relD,
    },
  ];
}

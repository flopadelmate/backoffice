import { z } from "zod";

/**
 * Types pour l'onglet Post-match du PMR Wizard
 */

export interface PostMatchPlayer {
  publicId: string;
  displayName: string;
  pmr: number; // 0.1-8.9
  reliability: number; // 0-100
}

export interface PostMatchScoreSet {
  team1Games: number | null;
  team2Games: number | null;
}

export interface PostMatchInput {
  team1: [PostMatchPlayer, PostMatchPlayer];
  team2: [PostMatchPlayer, PostMatchPlayer];
  sets: [PostMatchScoreSet, PostMatchScoreSet, PostMatchScoreSet];
}

export interface PostMatchResult {
  playerPublicId: string;
  displayName: string;
  previousPmr: number;
  newPmr: number; // clampé 0.1-8.9
  delta: number; // = newPmr - previousPmr
  previousReliability: number;
  newReliability: number;
  deltaReliability: number; // = newReliability - previousReliability
}

/**
 * Validation Zod pour les scores de match
 */

// Helper: valide qu'un set est soit vide (null/null) soit complet (number/number)
const setSchema = z
  .object({
    team1Games: z.number().min(0).max(7).nullable(),
    team2Games: z.number().min(0).max(7).nullable(),
  })
  .refine(
    (set) => {
      // Les deux doivent être null OU les deux doivent être des numbers
      const bothNull = set.team1Games === null && set.team2Games === null;
      const bothFilled =
        set.team1Games !== null && set.team2Games !== null;
      return bothNull || bothFilled;
    },
    {
      message: "Un set doit être soit vide (null/null) soit complet (pas de valeur partielle)",
    }
  )
  .refine(
    (set) => {
      // Si le set n'est pas vide, il doit être valide
      if (set.team1Games === null || set.team2Games === null) {
        return true; // Set vide, pas de validation supplémentaire
      }

      const g1 = set.team1Games;
      const g2 = set.team2Games;

      // Sets valides :
      // - 6-0, 6-1, 6-2, 6-3, 6-4 (gagnant à 6, écart ≥2)
      // - 7-5, 7-6 (gagnant à 7, écart 1-2)
      const isValid6 =
        (g1 === 6 && g2 >= 0 && g2 <= 4) ||
        (g2 === 6 && g1 >= 0 && g1 <= 4);
      const isValid7 =
        (g1 === 7 && (g2 === 5 || g2 === 6)) ||
        (g2 === 7 && (g1 === 5 || g1 === 6));

      return isValid6 || isValid7;
    },
    {
      message: "Score invalide. Sets valides : 6-0..6-4, 7-5, 7-6",
    }
  );

// Helper: détermine si un set est vide
function isSetEmpty(set: PostMatchScoreSet): boolean {
  return set.team1Games === null && set.team2Games === null;
}

// Helper: compte le nombre de sets gagnés par chaque équipe
function countSetsWon(sets: [PostMatchScoreSet, PostMatchScoreSet]): {
  team1Sets: number;
  team2Sets: number;
} {
  let team1Sets = 0;
  let team2Sets = 0;

  sets.forEach((set) => {
    if (set.team1Games !== null && set.team2Games !== null) {
      if (set.team1Games > set.team2Games) {
        team1Sets++;
      } else {
        team2Sets++;
      }
    }
  });

  return { team1Sets, team2Sets };
}

export const postMatchScoreSchema = z
  .object({
    set1: setSchema,
    set2: setSchema,
    set3: setSchema,
  })
  .refine(
    (data) => {
      // Set1 et set2 doivent être non vides
      return !isSetEmpty(data.set1) && !isSetEmpty(data.set2);
    },
    {
      message: "Les sets 1 et 2 sont obligatoires",
      path: ["set1"],
    }
  )
  .refine(
    (data) => {
      // Si on a set1 et set2, vérifier la règle du set3
      if (isSetEmpty(data.set1) || isSetEmpty(data.set2)) {
        return true; // Déjà géré par la règle précédente
      }

      const { team1Sets, team2Sets } = countSetsWon([data.set1, data.set2]);
      const isTied = team1Sets === 1 && team2Sets === 1;
      const set3IsEmpty = isSetEmpty(data.set3);

      if (isTied) {
        // Si égalité 1-1, set3 est obligatoire
        return !set3IsEmpty;
      } else {
        // Si match 2-0 ou 0-2, set3 doit être vide
        return set3IsEmpty;
      }
    },
    {
      message:
        "Set3 obligatoire si égalité 1-1, doit être vide si match 2-0 ou 0-2",
      path: ["set3"],
    }
  );

export type PostMatchScoreInput = z.infer<typeof postMatchScoreSchema>;

/**
 * Validation PMR (0.1-8.9)
 */
export const pmrSchema = z
  .number()
  .min(0.1, "PMR minimum : 0.1")
  .max(8.9, "PMR maximum : 8.9");

/**
 * Helper: clamp un PMR entre 0.1 et 8.9
 */
export function clampPmr(pmr: number): number {
  return Math.max(0.1, Math.min(8.9, pmr));
}

/**
 * Validation Reliability (0-100)
 */
export const reliabilitySchema = z
  .number()
  .min(0, "Fiabilité minimum : 0%")
  .max(100, "Fiabilité maximum : 100%");

/**
 * Helper: clamp une reliability entre 0 et 100
 */
export function clampReliability(reliability: number): number {
  return Math.max(0, Math.min(100, reliability));
}

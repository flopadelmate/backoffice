import * as z from "zod";

/**
 * Schema for PMR (Player Match Rating) onboarding questionnaire
 * Captures player skill level through 5 assessment questions
 */
export const pmrOnboardingSchema = z.object({
  niveau: z.string().min(1, "Veuillez sélectionner votre niveau"),
  experience: z.string().min(1, "Veuillez sélectionner votre expérience"),
  competition: z.string().min(1, "Veuillez sélectionner votre niveau de compétition"),
  volee: z.string().min(1, "Veuillez sélectionner votre niveau en volée"),
  rebonds: z.string().min(1, "Veuillez sélectionner votre niveau aux rebonds"),
});

export type PmrOnboardingData = z.infer<typeof pmrOnboardingSchema>;

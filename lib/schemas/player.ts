import * as z from "zod";

/**
 * Validation PMR alignée sur le swagger backend : min 1, max 8.
 */
const pmrSchema = z
  .number()
  .min(1, "Le PMR doit être entre 1 et 8")
  .max(8, "Le PMR doit être entre 1 et 8");

/**
 * Schema pour la création de joueur.
 * Le displayName peut être vide (auto-génération côté submit).
 * PMR est optionnel dans le form mais requis via refine.
 */
export const playerCreateSchema = z.object({
  displayName: z.string(),
  pmr: pmrSchema.optional().refine((val) => val !== undefined, "Le PMR est requis"),
  preferredCourtPosition: z.enum(["LEFT", "RIGHT", "BOTH"]),
});

export type PlayerCreateFormData = z.infer<typeof playerCreateSchema>;

/**
 * Schema pour l'édition de joueur.
 * Tous les champs sont requis.
 */
export const playerUpdateSchema = z.object({
  displayName: z.string().min(1, "Le nom est requis"),
  pmr: pmrSchema,
  preferredCourtPosition: z.enum(["LEFT", "RIGHT", "BOTH"]),
});

export type PlayerUpdateFormData = z.infer<typeof playerUpdateSchema>;

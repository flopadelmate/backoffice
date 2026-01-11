import * as z from "zod";

/**
 * Schema for creating an external ID alias (Place ID mapping)
 */
export const createExternalIdAliasSchema = z.object({
  targetExternalId: z
    .string()
    .trim()
    .min(1, "Le nouveau Place ID est requis"),
  reason: z.string().optional(),
});

export type CreateExternalIdAliasFormData = z.infer<
  typeof createExternalIdAliasSchema
>;

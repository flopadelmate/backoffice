import { z } from "zod";

export const createExternalIdSchema = z.object({
  source: z.enum(["GOOGLE", "TENUP", "DOIN_SPORT"]),
  externalId: z.string().min(1, "L'ID externe est requis"),
});

export const updateExternalIdSchema = z.object({
  externalId: z.string().min(1, "L'ID externe est requis"),
});

export type CreateExternalIdFormData = z.infer<typeof createExternalIdSchema>;
export type UpdateExternalIdFormData = z.infer<typeof updateExternalIdSchema>;

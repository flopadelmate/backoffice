import * as z from "zod";

/**
 * Schema for adding a club to the whitelist
 */
export const addToWhitelistSchema = z.object({
  externalId: z.string().min(1, "Le Place ID est requis"),
  reason: z.string().optional(),
});

export type AddToWhitelistFormData = z.infer<typeof addToWhitelistSchema>;

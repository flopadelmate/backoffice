import { z } from "zod";

export const reservationSystemSchema = z
  .object({
    systemType: z.enum([
      "UNKNOWN",
      "NOT_IMPLEMENTED",
      "TENUP",
      "GESTION_SPORTS",
      "DOIN_SPORT",
      "OPEN_RESA",
    ]),
    backendUrl: z
      .union([z.string().url("URL invalide"), z.literal(""), z.null()])
      .transform((val) => (val === "" ? null : val)),
    frontendUrl: z
      .union([z.string().url("URL invalide"), z.literal(""), z.null()])
      .transform((val) => (val === "" ? null : val)),
    clubId: z
      .union([z.string(), z.literal(""), z.null()])
      .transform((val) => (val === "" ? null : val)),
    email: z
      .union([z.string().email("Email invalide"), z.literal(""), z.null()])
      .transform((val) => (val === "" ? null : val)),
    password: z
      .union([z.string(), z.literal(""), z.null()])
      .transform((val) => (val === "" ? null : val)),
  })
  .superRefine((data, ctx) => {
    // Pas de validation pour UNKNOWN et NOT_IMPLEMENTED
    if (data.systemType === "UNKNOWN" || data.systemType === "NOT_IMPLEMENTED") {
      return;
    }

    // Helper pour vérifier qu'un champ est rempli (non null, non vide après trim)
    const isFieldFilled = (value: string | null): boolean => {
      return value !== null && value.trim().length > 0;
    };

    // TENUP : clubId obligatoire
    if (data.systemType === "TENUP") {
      if (!isFieldFilled(data.clubId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ID Club obligatoire pour TENUP",
          path: ["clubId"],
        });
      }
    }

    // GESTION_SPORTS : frontendUrl, clubId, email, password obligatoires
    if (data.systemType === "GESTION_SPORTS") {
      if (!isFieldFilled(data.frontendUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "URL frontend obligatoire pour Gestion Sports",
          path: ["frontendUrl"],
        });
      }
      if (!isFieldFilled(data.clubId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ID Club obligatoire pour Gestion Sports",
          path: ["clubId"],
        });
      }
      if (!isFieldFilled(data.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email obligatoire pour Gestion Sports",
          path: ["email"],
        });
      }
      if (!isFieldFilled(data.password)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mot de passe obligatoire pour Gestion Sports",
          path: ["password"],
        });
      }
    }

    // DOIN_SPORT : frontendUrl, clubId obligatoires
    if (data.systemType === "DOIN_SPORT") {
      if (!isFieldFilled(data.frontendUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "URL frontend obligatoire pour Doin Sport",
          path: ["frontendUrl"],
        });
      }
      if (!isFieldFilled(data.clubId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ID Club obligatoire pour Doin Sport",
          path: ["clubId"],
        });
      }
    }

    // OPEN_RESA : frontendUrl, email, password obligatoires
    if (data.systemType === "OPEN_RESA") {
      if (!isFieldFilled(data.frontendUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "URL frontend obligatoire pour Open Resa",
          path: ["frontendUrl"],
        });
      }
      if (!isFieldFilled(data.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email obligatoire pour Open Resa",
          path: ["email"],
        });
      }
      if (!isFieldFilled(data.password)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mot de passe obligatoire pour Open Resa",
          path: ["password"],
        });
      }
    }
  });

export type ReservationSystemFormData = z.infer<
  typeof reservationSystemSchema
>;

import { z } from "zod";

export const reservationSystemSchema = z.object({
  systemType: z.enum([
    "UNKNOWN",
    "TENUP",
    "GESTION_SPORTS",
    "DOIN_SPORT",
    "OPEN_RESA",
  ]),
  backendUrl: z
    .union([
      z.string().url("URL invalide"),
      z.literal(""),
      z.null(),
    ])
    .transform((val) => (val === "" ? null : val)),
  frontendUrl: z
    .union([
      z.string().url("URL invalide"),
      z.literal(""),
      z.null(),
    ])
    .transform((val) => (val === "" ? null : val)),
  email: z
    .union([
      z.string().email("Email invalide"),
      z.literal(""),
      z.null(),
    ])
    .transform((val) => (val === "" ? null : val)),
  password: z
    .union([
      z.string(),
      z.literal(""),
      z.null(),
    ])
    .transform((val) => (val === "" ? null : val)),
});

export type ReservationSystemFormData = z.infer<
  typeof reservationSystemSchema
>;

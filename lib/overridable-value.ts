import { type OverridableValue } from "@/types/api";

// Re-export OverridableValue for convenience
export type { OverridableValue } from "@/types/api";

/**
 * Extrait la valeur effective d'un champ overridable.
 * Retourne admin si défini, sinon scraped.
 */
export function getEffectiveValue<T>(
  ov: OverridableValue<T> | null | undefined
): T | null {
  if (ov == null) return null;
  return ov.admin != null ? ov.admin : ov.scraped;
}

/**
 * Vérifie si un champ a une valeur admin override.
 */
export function hasAdminOverride<T>(
  ov: OverridableValue<T> | null | undefined
): boolean {
  return ov?.admin != null;
}

/**
 * Récupère la valeur scraped (pour affichage dans tooltip).
 */
export function getScrapedValue<T>(
  ov: OverridableValue<T> | null | undefined
): T | null {
  return ov?.scraped ?? null;
}

/**
 * Formate une adresse pour la copie dans le presse-papier.
 * Format: "street, zipCode city"
 */
export function formatAddressForCopy(
  addr: { street: string; zipCode: string; city: string } | null
): string {
  if (!addr) return "Aucune adresse";
  return `${addr.street}, ${addr.zipCode} ${addr.city}`;
}

/**
 * Formate des coordonnées GPS pour la copie dans le presse-papier.
 * Format: "latitude, longitude"
 */
export function formatGeoForCopy(
  geo: { latitude: number; longitude: number } | null
): string {
  if (!geo) return "Aucune coordonnée";
  return `${geo.latitude}, ${geo.longitude}`;
}

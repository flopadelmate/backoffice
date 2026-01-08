/**
 * Helpers pour gérer la pagination, le tri et la construction d'URLs propres
 * Utilisables sur toutes les pages avec listing paginé
 *
 * RESPONSABILITÉS :
 * - Parse et validation des paramètres page/size/sortBy/sortDir depuis URL
 * - Construction d'URLs propres (omet les valeurs = defaults)
 * - Type-safe avec génériques TypeScript
 *
 * HORS SCOPE (reste page-specific) :
 * - Gestion des filtres métier (nom, département, etc.)
 * - State management (React state, useEffect, etc.)
 * - Router navigation (push/replace)
 */

export type SortDirection = "asc" | "desc";

/**
 * Paramètres de pagination de base (page, size, sort)
 */
export interface PaginationParams {
  page: number;
  size: number;
  sortBy: string;
  sortDir: SortDirection;
}

/**
 * Configuration pour le parsing et la validation
 */
export interface PaginationConfig {
  /** Numéro de page par défaut (default: 0) */
  defaultPage?: number;
  /** Taille de page par défaut (default: 20) */
  defaultSize?: number;
  /** Tailles de page autorisées (default: [20, 50, 100]) */
  validSizes?: number[];
  /** Champs de tri autorisés (si non fourni, accepte tout) */
  validSortFields?: string[];
  /** Champ de tri par défaut (default: "name") */
  defaultSortBy?: string;
  /** Direction de tri par défaut (default: "asc") */
  defaultSortDir?: SortDirection;
}

/**
 * Parse et valide les paramètres de pagination depuis URLSearchParams
 *
 * RÈGLES DE VALIDATION :
 * - page : entier >= 0, sinon utilise default
 * - size : entier dans validSizes, sinon utilise default
 * - sortBy : string dans validSortFields (si fourni), sinon utilise default
 * - sortDir : "asc" ou "desc", sinon utilise default
 *
 * @param searchParams - URLSearchParams de Next.js (useSearchParams())
 * @param config - Configuration avec defaults et whitelist
 * @returns Objet PaginationParams validé et typé
 *
 * @example
 * const searchParams = useSearchParams();
 * const pagination = parsePaginationParams(searchParams, {
 *   validSizes: [20, 50, 100],
 *   validSortFields: ["name", "createdAt", "status"],
 *   defaultSortBy: "name"
 * });
 * // { page: 0, size: 20, sortBy: "name", sortDir: "asc" }
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  config: PaginationConfig = {}
): PaginationParams {
  // Defaults
  const defaultPage = config.defaultPage ?? 0;
  const defaultSize = config.defaultSize ?? 20;
  const validSizes = config.validSizes ?? [20, 50, 100];
  const defaultSortBy = config.defaultSortBy ?? "name";
  const defaultSortDir = config.defaultSortDir ?? "asc";

  // Parse page (int, clamp >= 0, default: 0)
  const pageParam = searchParams.get("page");
  const parsedPage = pageParam ? parseInt(pageParam, 10) : defaultPage;
  const page = !isNaN(parsedPage) && parsedPage >= 0 ? parsedPage : defaultPage;

  // Parse size (int, whitelist, default: 20)
  const sizeParam = searchParams.get("size");
  const parsedSize = sizeParam ? parseInt(sizeParam, 10) : defaultSize;
  const size = validSizes.includes(parsedSize) ? parsedSize : defaultSize;

  // Parse sortBy (validate against whitelist if provided, default: "name")
  const sortByParam = searchParams.get("sortBy");
  let sortBy = defaultSortBy;
  if (sortByParam) {
    if (config.validSortFields) {
      // Validate against whitelist if provided
      sortBy = config.validSortFields.includes(sortByParam)
        ? sortByParam
        : defaultSortBy;
    } else {
      // Accept any value if no whitelist
      sortBy = sortByParam;
    }
  }

  // Parse sortDir (validate "asc" | "desc", default: "asc")
  const sortDirParam = searchParams.get("sortDir");
  const sortDir: SortDirection =
    sortDirParam === "desc" ? "desc" : defaultSortDir;

  return { page, size, sortBy, sortDir };
}

/**
 * Construit une query string propre en omettant les valeurs = defaults
 *
 * RÈGLES :
 * - Omet page si = defaultPage (ex: 0)
 * - Omet size si = defaultSize (ex: 20)
 * - Omet sortBy si = defaultSortBy (ex: "name")
 * - Omet sortDir si = defaultSortDir (ex: "asc")
 * - Ajoute toujours les autres params fournis (filtres, etc.)
 *
 * @param pagination - Paramètres de pagination à encoder
 * @param config - Configuration avec defaults (pour savoir quoi omettre)
 * @param otherParams - Autres paramètres à ajouter (filtres métier, etc.)
 * @returns Query string (ex: "?page=1&size=50&name=Paris") ou "" si vide
 *
 * @example
 * buildPaginationUrl(
 *   { page: 1, size: 50, sortBy: "name", sortDir: "desc" },
 *   { defaultPage: 0, defaultSize: 20, defaultSortBy: "name", defaultSortDir: "asc" },
 *   { name: "Paris", verified: "true" }
 * )
 * // → "?page=1&size=50&sortDir=desc&name=Paris&verified=true"
 * //   (page/size/sortDir inclus car != defaults, sortBy omis car = default)
 */
export function buildPaginationUrl(
  pagination: PaginationParams,
  config: PaginationConfig = {},
  otherParams: Record<string, string | number | boolean> = {}
): string {
  const searchParams = new URLSearchParams();

  // Defaults (pour savoir quoi omettre)
  const defaultPage = config.defaultPage ?? 0;
  const defaultSize = config.defaultSize ?? 20;
  const defaultSortBy = config.defaultSortBy ?? "name";
  const defaultSortDir = config.defaultSortDir ?? "asc";

  // Ajouter pagination params (seulement si != default)
  if (pagination.page !== defaultPage) {
    searchParams.set("page", pagination.page.toString());
  }
  if (pagination.size !== defaultSize) {
    searchParams.set("size", pagination.size.toString());
  }
  if (pagination.sortBy !== defaultSortBy) {
    searchParams.set("sortBy", pagination.sortBy);
  }
  if (pagination.sortDir !== defaultSortDir) {
    searchParams.set("sortDir", pagination.sortDir);
  }

  // Ajouter autres params (filtres, etc.)
  Object.entries(otherParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, value.toString());
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

/**
 * Helper pour construire un objet otherParams propre (omet undefined/null/empty)
 *
 * Utile pour passer à buildPaginationUrl() en omettant les filtres vides.
 *
 * @param params - Objet avec valeurs potentiellement undefined/null/""
 * @returns Objet nettoyé (sans undefined/null/"")
 *
 * @example
 * cleanParams({ name: "Paris", department: "", verified: undefined, status: "ACTIVE" })
 * // → { name: "Paris", status: "ACTIVE" }
 */
export function cleanParams(
  params: Record<string, string | number | boolean | undefined | null>
): Record<string, string | number | boolean> {
  const cleaned: Record<string, string | number | boolean> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

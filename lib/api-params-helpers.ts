/**
 * Helpers pour construire des objets API avec propriétés optionnelles strictes.
 *
 * Respecte exactOptionalPropertyTypes: true en omettant vraiment les propriétés
 * au lieu d'assigner T | undefined à une propriété optionnelle de type T?.
 *
 * RÈGLES DE VALIDATION:
 * - string: Ajouter seulement si value != null && value.trim().length > 0
 * - boolean: Ajouter si value !== undefined (false est une valeur valide!)
 * - array: Ajouter seulement si Array.isArray(arr) && arr.length > 0
 * - enum/union: Ajouter si value !== undefined
 * - number: Ajouter si value !== undefined (0 est une valeur valide!)
 *
 * @example
 * let params: GetClubsParams = { page: 0, size: 20 };
 * params = addOptionalString(params, "name", searchName);
 * params = addOptionalBool(params, "verified", isVerified);
 * params = addOptionalArray(params, "clubPublicIds", selectedClubIds);
 */

/**
 * Ajoute une propriété string optionnelle.
 *
 * RÈGLE: Ajouter seulement si value != null && value.trim().length > 0
 * - Exclut: null, undefined, "", "  " (whitespace only)
 * - Inclut: "hello", "0", " a " (contains non-whitespace)
 *
 * @param obj - Objet de base
 * @param key - Nom de la propriété
 * @param value - Valeur string (peut être null/undefined)
 * @returns Objet avec propriété ajoutée (si valide) ou objet inchangé
 *
 * @example
 * addOptionalString({}, "name", "John") → { name: "John" }
 * addOptionalString({}, "name", "") → {}
 * addOptionalString({}, "name", "  ") → {}
 * addOptionalString({}, "name", null) → {}
 */
export function addOptionalString<T>(
  obj: T,
  key: string,
  value: string | null | undefined
): T {
  if (value != null && value.trim().length > 0) {
    return { ...obj, [key]: value } as T;
  }
  return obj;
}

/**
 * Ajoute une propriété boolean optionnelle.
 *
 * RÈGLE: Ajouter si value !== undefined (false est une valeur valide!)
 * - Exclut: undefined
 * - Inclut: true, false
 *
 * @param obj - Objet de base
 * @param key - Nom de la propriété
 * @param value - Valeur boolean (peut être undefined)
 * @returns Objet avec propriété ajoutée (si définie) ou objet inchangé
 *
 * @example
 * addOptionalBool({}, "verified", true) → { verified: true }
 * addOptionalBool({}, "verified", false) → { verified: false }
 * addOptionalBool({}, "verified", undefined) → {}
 */
export function addOptionalBool<T>(
  obj: T,
  key: string,
  value: boolean | undefined
): T {
  if (value !== undefined) {
    return { ...obj, [key]: value } as T;
  }
  return obj;
}

/**
 * Ajoute une propriété array optionnelle.
 *
 * RÈGLE: Ajouter seulement si Array.isArray(arr) && arr.length > 0
 * - Exclut: null, undefined, [], non-array
 * - Inclut: [1], ["a"], [null] (array avec au moins 1 élément)
 *
 * @param obj - Objet de base
 * @param key - Nom de la propriété
 * @param value - Valeur array (peut être null/undefined)
 * @returns Objet avec propriété ajoutée (si valide) ou objet inchangé
 *
 * @example
 * addOptionalArray({}, "ids", [1, 2, 3]) → { ids: [1, 2, 3] }
 * addOptionalArray({}, "ids", []) → {}
 * addOptionalArray({}, "ids", null) → {}
 */
export function addOptionalArray<T, Item>(
  obj: T,
  key: string,
  value: Item[] | null | undefined
): T {
  if (Array.isArray(value) && value.length > 0) {
    return { ...obj, [key]: value } as T;
  }
  return obj;
}

/**
 * Ajoute une propriété enum/union optionnelle.
 *
 * RÈGLE: Ajouter si value !== undefined
 * - Exclut: undefined
 * - Inclut: toute valeur définie (y compris null si c'est une valeur valide de l'enum)
 *
 * @param obj - Objet de base
 * @param key - Nom de la propriété
 * @param value - Valeur enum (peut être undefined)
 * @returns Objet avec propriété ajoutée (si définie) ou objet inchangé
 *
 * @example
 * addOptionalEnum({}, "status", "ACTIVE") → { status: "ACTIVE" }
 * addOptionalEnum({}, "status", undefined) → {}
 *
 * Usage avec encodeReservationSystemForApi:
 * params = addOptionalEnum(params, "reservationSystem", encodeReservationSystemForApi(value));
 */
export function addOptionalEnum<T, E>(
  obj: T,
  key: string,
  value: E | undefined
): T {
  if (value !== undefined) {
    return { ...obj, [key]: value } as T;
  }
  return obj;
}

/**
 * Ajoute une propriété number optionnelle.
 *
 * RÈGLE: Ajouter si value !== undefined (0 est une valeur valide!)
 * - Exclut: undefined
 * - Inclut: 0, -1, 42, 3.14, NaN, Infinity
 *
 * @param obj - Objet de base
 * @param key - Nom de la propriété
 * @param value - Valeur number (peut être undefined)
 * @returns Objet avec propriété ajoutée (si définie) ou objet inchangé
 *
 * @example
 * addOptionalNumber({}, "count", 0) → { count: 0 }
 * addOptionalNumber({}, "count", 42) → { count: 42 }
 * addOptionalNumber({}, "count", undefined) → {}
 */
export function addOptionalNumber<T>(
  obj: T,
  key: string,
  value: number | undefined
): T {
  if (value !== undefined) {
    return { ...obj, [key]: value } as T;
  }
  return obj;
}

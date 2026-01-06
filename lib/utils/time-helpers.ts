/**
 * Parse un slot horaire au format "HH:mm" avec validation stricte.
 *
 * Cette fonction est utilisée pour parser des slots générés programmatiquement.
 * Si le format est invalide, c'est un bug dans notre code, donc on throw.
 *
 * @param slot - Slot horaire au format "HH:mm" (ex: "14:30")
 * @returns Objet avec hours et minutes parsés
 * @throws Error si le format est invalide
 *
 * @example
 * parseTimeSlot("14:30") → { hours: 14, minutes: 30 }
 * parseTimeSlot("invalid") → throw Error
 */
export function parseTimeSlot(slot: string): { hours: number; minutes: number } {
  const parts = slot.split(":");

  if (parts.length !== 2) {
    throw new Error(
      `[parseTimeSlot] Format invalide "${slot}" (attendu "HH:mm", reçu ${parts.length} partie(s) après split)`
    );
  }

  const [hoursStr, minutesStr] = parts;

  if (!hoursStr || !minutesStr) {
    throw new Error(
      `[parseTimeSlot] Format invalide "${slot}" (parties vides après split - hoursStr="${hoursStr}", minutesStr="${minutesStr}")`
    );
  }

  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(
      `[parseTimeSlot] Valeurs non-numériques dans "${slot}" (hours=${hoursStr} → ${hours}, minutes=${minutesStr} → ${minutes})`
    );
  }

  return { hours, minutes };
}

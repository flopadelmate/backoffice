import type {
  ClubBackofficeDetailDto,
  ClubBackofficeUpdateDto,
  ReservationSystem,
} from "@/types/api";
import { encodeReservationSystemForApi } from "@/types/api";
import { addOptionalEnum } from "@/lib/api-params-helpers";
import { getEffectiveValue } from "@/lib/overridable-value";

/**
 * Type pour le draft local (valeurs effectives simples)
 * Utilisé pour l'édition dans les composants
 */
export interface ClubDraft {
  id: number;
  name: string;
  phone: string;
  address: { street: string; zipCode: string; city: string };
  websiteUrl: string;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  reservationSystem?: ReservationSystem | undefined;
  frontendUrl: string;
  mainPhotoUrl: string;
  notes: string;
}

/**
 * Hydrate un draft à partir des données API brutes
 * Extrait les valeurs effectives (admin ?? scraped) pour édition
 */
export function hydrateDraftFromApi(
  club: ClubBackofficeDetailDto
): ClubDraft {
  const effectiveAddress = getEffectiveValue(club.address) ?? {
    street: "",
    zipCode: "",
    city: "",
  };
  const effectiveGeo = getEffectiveValue(club.geo);

  return {
    id: club.id,
    name: getEffectiveValue(club.name) ?? "",
    phone: getEffectiveValue(club.phone) ?? "",
    address: effectiveAddress,
    websiteUrl: getEffectiveValue(club.websiteUrl) ?? "",
    latitude: effectiveGeo?.latitude ?? null,
    longitude: effectiveGeo?.longitude ?? null,
    verified: club.verified,
    reservationSystem: club.reservationSystem,
    frontendUrl: club.frontendUrl,
    mainPhotoUrl: club.mainPhotoUrl,
    notes: club.notes,
  };
}

/**
 * Compute changes between original and current club data
 * Only returns fields that have been modified
 * Maps latitude/longitude to geo object for API compatibility
 */
export function computeChanges(
  original: ClubBackofficeDetailDto,
  current: ClubDraft
): ClubBackofficeUpdateDto {
  const changes: ClubBackofficeUpdateDto = {};

  // Extraire les valeurs effectives de l'original pour comparaison
  const originalEffective = hydrateDraftFromApi(original);

  // Simple fields
  if (originalEffective.name !== current.name) {
    changes.name = current.name;
  }
  if (originalEffective.phone !== current.phone) {
    changes.phone = current.phone;
  }
  if (originalEffective.websiteUrl !== current.websiteUrl) {
    changes.websiteUrl = current.websiteUrl;
  }
  if (originalEffective.verified !== current.verified) {
    changes.verified = current.verified;
  }
  if (originalEffective.reservationSystem !== current.reservationSystem) {
    // Encode pour envoi API: UNKNOWN/NOT_IMPLEMENTED → undefined (omis)
    const encodedSystem = encodeReservationSystemForApi(
      current.reservationSystem
    );
    if (encodedSystem !== undefined) {
      changes.reservationSystem = encodedSystem;
    }
  }
  if (originalEffective.frontendUrl !== current.frontendUrl) {
    changes.frontendUrl = current.frontendUrl;
  }
  if (originalEffective.notes !== current.notes) {
    changes.notes = current.notes;
  }
  if (originalEffective.mainPhotoUrl !== current.mainPhotoUrl) {
    changes.mainPhotoUrl = current.mainPhotoUrl;
  }

  // Address (deep comparison)
  if (
    originalEffective.address.street !== current.address.street ||
    originalEffective.address.zipCode !== current.address.zipCode ||
    originalEffective.address.city !== current.address.city
  ) {
    changes.address = current.address;
  }

  // Geo : envoyer UNIQUEMENT si les 2 coords sont non-null et valides
  if (
    originalEffective.latitude !== current.latitude ||
    originalEffective.longitude !== current.longitude
  ) {
    if (
      current.latitude != null &&
      current.longitude != null &&
      !isNaN(current.latitude) &&
      !isNaN(current.longitude)
    ) {
      changes.geo = {
        latitude: current.latitude,
        longitude: current.longitude,
      };
    }
  }

  return changes;
}

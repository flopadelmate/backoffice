import type {
  ClubBackofficeDetailDto,
  ClubBackofficeUpdateDto,
  ReservationSystem,
} from "@/types/api";
import { encodeReservationSystemForApi } from "@/types/api";
import { addOptionalEnum } from "@/lib/api-params-helpers";

/**
 * Compute changes between original and current club data
 * Only returns fields that have been modified
 * Maps latitude/longitude to geo object for API compatibility
 */
export function computeChanges(
  original: ClubBackofficeDetailDto,
  current: ClubBackofficeDetailDto
): ClubBackofficeUpdateDto {
  const changes: ClubBackofficeUpdateDto = {};

  // Simple fields
  if (original.name !== current.name) {
    changes.name = current.name;
  }
  if (original.phone !== current.phone) {
    changes.phone = current.phone;
  }
  if (original.websiteUrl !== current.websiteUrl) {
    changes.websiteUrl = current.websiteUrl;
  }
  if (original.verified !== current.verified) {
    changes.verified = current.verified;
  }
  if (original.reservationSystem !== current.reservationSystem) {
    // Encode pour envoi API: UNKNOWN/NOT_IMPLEMENTED → undefined (omis)
    const encodedSystem = encodeReservationSystemForApi(current.reservationSystem);
    if (encodedSystem !== undefined) {
      changes.reservationSystem = encodedSystem;
    }
  }
  if (original.reservationUrl !== current.reservationUrl) {
    changes.reservationUrl = current.reservationUrl;
  }
  if (original.notes !== current.notes) {
    changes.notes = current.notes;
  }
  if (original.mainPhotoUrl !== current.mainPhotoUrl) {
    changes.mainPhotoUrl = current.mainPhotoUrl;
  }

  // Address (deep comparison)
  if (JSON.stringify(original.address) !== JSON.stringify(current.address)) {
    changes.address = current.address;
  }

  // Geo mapping (latitude/longitude → geo)
  // IMPORTANT: Never send NaN
  if (
    original.latitude !== current.latitude ||
    original.longitude !== current.longitude
  ) {
    if (!isNaN(current.latitude) && !isNaN(current.longitude)) {
      changes.geo = {
        latitude: current.latitude,
        longitude: current.longitude,
      };
    }
  }

  return changes;
}

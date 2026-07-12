import { isAccessActive, isAccessExpired } from "@/lib/entitlements/access";
import type { Entitlements } from "@/types/auth";
import type { InstalledTourMeta } from "@/types/tour-bundle";

/**
 * Has access to this downloaded tour ended?
 *
 * The current entitlements snapshot wins when we have one — a renewal extends a
 * bundle that was stamped with an older expiry, and a revoked tour is expired even
 * if its stamp hasn't run out. Only when no snapshot is available (never signed in,
 * or snapshot lost) do we fall back to the expiry stamped into the bundle at
 * install time, which is what makes the check work offline.
 *
 * Neither date known ⇒ NOT expired: we never delete a user's downloaded content on
 * the strength of data we don't have.
 */
export function isTourAccessExpired(
  meta: Pick<InstalledTourMeta, "tourId" | "accessExpiresAt">,
  entitlements: Entitlements | null | undefined,
  now: number = Date.now(),
) {
  if (entitlements) {
    if (!isAccessActive(entitlements, now)) {
      return true;
    }

    return !entitlements.tours.some((tour) => tour.id === meta.tourId);
  }

  return isAccessExpired(meta.accessExpiresAt, now);
}

export function findExpiredInstalledTours(
  installed: InstalledTourMeta[],
  entitlements: Entitlements | null | undefined,
  now: number = Date.now(),
) {
  return installed
    .filter((meta) => isTourAccessExpired(meta, entitlements, now))
    .map((meta) => meta.tourId);
}

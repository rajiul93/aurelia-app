import type { Entitlements, EntitlementsSnapshot } from "@/types/auth";

/**
 * True once an access window has passed. A missing/unparseable date means
 * "no known expiry" — treated as not expired, so we never lock or delete a
 * user's downloaded content on the strength of data we don't have.
 */
export function isAccessExpired(
  expiresAt: string | null | undefined,
  now: number = Date.now(),
) {
  if (!expiresAt) {
    return false;
  }

  const expiry = new Date(expiresAt).getTime();

  if (Number.isNaN(expiry)) {
    return false;
  }

  return expiry <= now;
}

export function isAccessActive(
  entitlements: Entitlements | null | undefined,
  now: number = Date.now(),
) {
  if (!entitlements) {
    return true;
  }

  if (entitlements.status !== "ACTIVE") {
    return false;
  }

  return !isAccessExpired(entitlements.expiresAt, now);
}

/**
 * Whether the user actually holds a usable plan right now: signed in, access
 * ACTIVE and unexpired, and carrying at least one tour.
 *
 * Deliberately stricter than `isAccessActive`, which is fail-open (returns true
 * for a signed-out visitor and for missing entitlements). Gating the Buy-Plan /
 * Why-Buy sections on `isAccessActive` would hide them from exactly the people
 * they are meant for — so those use this instead.
 */
export function hasActivePlan(
  isSignedIn: boolean,
  entitlements: Entitlements | null | undefined,
  now: number = Date.now(),
) {
  return (
    isSignedIn &&
    Boolean(entitlements) &&
    isAccessActive(entitlements, now) &&
    (entitlements?.tours.length ?? 0) > 0
  );
}

/**
 * Whether the persisted snapshot still covers the current moment. While it does,
 * the app must not call the entitlements API at all — that is the whole point of
 * the snapshot.
 */
export function isSnapshotUsable(
  snapshot: EntitlementsSnapshot | null,
  now: number = Date.now(),
) {
  if (!snapshot) {
    return false;
  }

  return !isAccessExpired(snapshot.entitlements.expiresAt, now);
}

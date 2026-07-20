import * as Location from "expo-location";

import type { RawGpsFix } from "@/lib/navigation/types";

export function toGpsFix(position: Location.LocationObject): RawGpsFix {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    heading: position.coords.heading,
    speed: position.coords.speed,
    timestamp: position.timestamp,
  };
}

const LAST_KNOWN_MAX_AGE_MS = 30 * 60_000;
const LAST_KNOWN_MAX_ACCURACY_M = 500;
const CURRENT_FIX_TIMEOUT_MS = 6_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race<T | null>([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

/**
 * Returns a location fix as quickly as possible: cached last-known first, then
 * a live fix (with timeout so UI never hangs forever).
 *
 * Keep the live fallback at `Balanced`. It is tempting to drop to `Low` for a
 * faster first marker, but the enum is named by power, not by speed:
 * `Low` is "accurate to the nearest kilometer" and `Balanced` "to within one
 * hundred meters" — and `Balanced` already avoids a GPS lock, so it is the tier
 * that works indoors. A `Low` fix would also exceed `maxAccuracyM` (65) and take
 * the unsnapped branch of processBootstrapLocation, painting the marker up to a
 * kilometre from the user — worse on a walking map than showing nothing yet.
 */
export async function resolveBootstrapLocation(): Promise<Location.LocationObject | null> {
  try {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_MAX_ACCURACY_M,
    });

    if (lastKnown) {
      return lastKnown;
    }
  } catch {
    // Fall through to a live fix.
  }

  try {
    return await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      CURRENT_FIX_TIMEOUT_MS,
    );
  } catch {
    return null;
  }
}

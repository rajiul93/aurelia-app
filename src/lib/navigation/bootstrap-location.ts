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
 * The live fallback asks for `Low` rather than `Balanced` on purpose. It only
 * has to put a marker on screen — the watch delivers the accurate position
 * moments later — and `Low` resolves from wifi/network triangulation, which
 * keeps working inside a building where GPS struggles. That is the case this
 * path exists for: a first-time visitor indoors, where last-known is empty.
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
        accuracy: Location.Accuracy.Low,
      }),
      CURRENT_FIX_TIMEOUT_MS,
    );
  } catch {
    return null;
  }
}

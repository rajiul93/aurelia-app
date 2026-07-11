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

const LAST_KNOWN_MAX_AGE_MS = 5 * 60_000;
const LAST_KNOWN_MAX_ACCURACY_M = 250;

/**
 * Returns a location fix as quickly as possible: cached last-known first, then
 * a balanced-accuracy current fix. Avoids the long cold-start wait from
 * jumping straight to high-accuracy GPS on first guided-walk open.
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
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    return null;
  }
}

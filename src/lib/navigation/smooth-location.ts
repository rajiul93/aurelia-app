import type { GeoPoint } from "@/types/bundle-content";

import { distanceBetweenPointsM } from "./snap-to-route";
import type { RawGpsFix } from "./types";

export type SmoothLocationState = {
  lastAccepted: GeoPoint | null;
  smoothed: GeoPoint | null;
};

export function createSmoothLocationState(): SmoothLocationState {
  return {
    lastAccepted: null,
    smoothed: null,
  };
}

export function isFixAccuracyAcceptable(
  fix: RawGpsFix,
  maxAccuracyM: number,
) {
  if (fix.accuracy === null || !Number.isFinite(fix.accuracy)) {
    return true;
  }

  return fix.accuracy <= maxAccuracyM;
}

export function shouldRejectGpsFix(
  fix: RawGpsFix,
  maxAccuracyM: number,
  previous: GeoPoint | null,
) {
  if (!previous) {
    return false;
  }

  return !isFixAccuracyAcceptable(fix, maxAccuracyM);
}

export function smoothLocation(
  state: SmoothLocationState,
  fix: RawGpsFix,
  alpha = 0.35,
): SmoothLocationState {
  const nextPoint = { lat: fix.lat, lng: fix.lng };

  if (!state.smoothed) {
    return {
      lastAccepted: nextPoint,
      smoothed: nextPoint,
    };
  }

  return {
    lastAccepted: nextPoint,
    smoothed: {
      lat: state.smoothed.lat + alpha * (nextPoint.lat - state.smoothed.lat),
      lng: state.smoothed.lng + alpha * (nextPoint.lng - state.smoothed.lng),
    },
  };
}

export function hasMovedEnough(
  previous: GeoPoint | null,
  next: GeoPoint,
  minMovementM: number,
) {
  if (!previous) {
    return true;
  }

  return distanceBetweenPointsM(previous, next) >= minMovementM;
}

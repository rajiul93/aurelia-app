import type { GeoPoint } from "@/types/bundle-content";

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type RawGpsFix = {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

export type SnappedPosition = GeoPoint & {
  distanceAlongRouteM: number;
  routeIndex: number;
  bearing: number;
};

export type NavigationStatus = "idle" | "tracking" | "offRoute" | "arrived";

export type ProximityState = {
  approachSpotId: string | null;
  arrivedSpotId: string | null;
  distanceToNextStopM: number | null;
};

export type NavigationThresholds = {
  maxAccuracyM: number;
  minMovementM: number;
  offRouteDistanceM: number;
  offRouteClearCount: number;
  approachRadiusM: number;
  arrivalRadiusM: number;
  arrivalDwellRadiusM: number;
  arrivalDwellMs: number;
  locationSmoothAlpha: number;
};

export const OFF_ROUTE_VOICE_COOLDOWN_MS = 60_000;

/**
 * ⚠️ Invariant: `approachRadiusM` **must stay greater than** `arrivalRadiusM`.
 *
 * Both are measured against the same "next incomplete spot", and crossing the
 * arrival radius marks that spot complete — which advances the next spot. So an
 * approach radius inside the arrival radius describes a window that never opens:
 * the stop is already completed by the time you reach it, and the approach cue
 * is silently never spoken. A test in navigation.test.ts guards this.
 *
 * The gap also has to survive real GPS error (10–20 m outdoors in Rome), which
 * is why arrival is not tightened instead — at ~6 m a stop would often never be
 * marked complete at all, stalling tour progress.
 */
export const DEFAULT_NAVIGATION_THRESHOLDS: NavigationThresholds = {
  maxAccuracyM: 65,
  minMovementM: 1,
  offRouteDistanceM: 10,
  offRouteClearCount: 1,
  approachRadiusM: 30,
  arrivalRadiusM: 20,
  arrivalDwellRadiusM: 30,
  arrivalDwellMs: 10_000,
  locationSmoothAlpha: 0.72,
};

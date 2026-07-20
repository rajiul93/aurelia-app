import type { BundleSpot, GeoPoint } from "@/types/bundle-content";

import { resolveDisplayBearing } from "./display-bearing";
import {
  createArrivalDwellState,
  evaluateProximity,
  getNextIncompleteSpot,
  type ArrivalDwellState,
} from "./proximity";
import {
  createOffRouteTracker,
  distanceToRouteM,
  updateOffRouteTracker,
  type OffRouteTracker,
} from "./off-route";
import { snapToRoute } from "./snap-to-route";
import {
  createSmoothLocationState,
  hasMovedEnough,
  isFixAccuracyAcceptable,
  shouldRejectGpsFix,
  smoothLocation,
  type SmoothLocationState,
} from "./smooth-location";
import type {
  NavigationStatus,
  NavigationThresholds,
  ProximityState,
  RawGpsFix,
  SnappedPosition,
} from "./types";
import { DEFAULT_NAVIGATION_THRESHOLDS } from "./types";
import { appendWalkTrail } from "./walk-trail";

export type NavigationSessionSnapshot = {
  status: NavigationStatus;
  rawLocation: GeoPoint | null;
  snappedLocation: SnappedPosition | null;
  displayLocation: GeoPoint | null;
  displayBearing: number;
  proximity: ProximityState;
  distanceOffRouteM: number;
  traversedFraction: number;
  walkTrail: GeoPoint[];
};

/**
 * Whether the session has any position to draw yet. Shared so the store and the
 * hook cannot disagree about what "we have a fix" means — the store uses it to
 * reject a late bootstrap fix, the hook to decide whether it is still waiting.
 */
export function hasLocationFix(
  snapshot: NavigationSessionSnapshot | null | undefined,
) {
  return Boolean(snapshot?.displayLocation ?? snapshot?.rawLocation);
}

export type NavigationSessionInternals = {
  smoothState: SmoothLocationState;
  offRouteTracker: OffRouteTracker;
  dwellState: ArrivalDwellState;
  approachAudioTriggeredForSpotId: string | null;
  routeLengthM: number;
  totalRoutePoints: number;
  walkTrail: GeoPoint[];
};

export function createNavigationSessionInternals(
  routeCoordinates: GeoPoint[],
  routeLengthM: number,
): NavigationSessionInternals {
  return {
    smoothState: createSmoothLocationState(),
    offRouteTracker: createOffRouteTracker(),
    dwellState: createArrivalDwellState(),
    approachAudioTriggeredForSpotId: null,
    routeLengthM: Math.max(routeLengthM, 1),
    totalRoutePoints: routeCoordinates.length,
    walkTrail: [],
  };
}

export type LocationUpdateResult = {
  snapshot: NavigationSessionSnapshot;
  internals: NavigationSessionInternals;
  shouldTriggerApproachAudio: boolean;
  shouldTriggerOffRouteVoice: boolean;
  shouldMarkArrived: boolean;
  arrivedSpotId: string | null;
};

function buildSnapshotFromState(input: {
  status: NavigationStatus;
  rawLocation: GeoPoint | null;
  smoothed: GeoPoint | null;
  snapped: SnappedPosition | null;
  displayBearing: number;
  proximity: ProximityState;
  distanceOffRouteM: number;
  traversedFraction: number;
  walkTrail: GeoPoint[];
}): NavigationSessionSnapshot {
  return {
    status: input.status,
    rawLocation: input.rawLocation,
    snappedLocation: input.snapped,
    displayLocation: input.smoothed,
    displayBearing: input.displayBearing,
    proximity: input.proximity,
    distanceOffRouteM: input.distanceOffRouteM,
    traversedFraction: input.traversedFraction,
    walkTrail: input.walkTrail,
  };
}

function finalizeUpdate(input: {
  fix: RawGpsFix;
  routeCoordinates: GeoPoint[];
  orderedSpots: BundleSpot[];
  completedSpotIds: Set<string>;
  internals: NavigationSessionInternals;
  thresholds: NavigationThresholds;
  wasOffRoute: boolean;
  smoothed: GeoPoint;
  walkTrail: GeoPoint[];
}): LocationUpdateResult {
  const {
    fix,
    routeCoordinates,
    orderedSpots,
    completedSpotIds,
    thresholds,
    wasOffRoute,
    smoothed,
  } = input;
  let internals = input.internals;

  const snapped = snapToRoute(routeCoordinates, smoothed);
  const offRouteTracker = updateOffRouteTracker(
    internals.offRouteTracker,
    routeCoordinates,
    smoothed,
    thresholds.offRouteDistanceM,
    thresholds.offRouteClearCount,
  );

  const nextSpot = getNextIncompleteSpot(orderedSpots, completedSpotIds);
  const proximityResult = evaluateProximity(
    snapped ?? smoothed,
    nextSpot,
    thresholds,
    internals.dwellState,
    fix.timestamp,
  );

  internals = {
    ...internals,
    offRouteTracker,
    dwellState: proximityResult.dwellState,
    walkTrail: input.walkTrail,
  };

  const shouldTriggerApproachAudio =
    proximityResult.shouldTriggerApproachAudio &&
    nextSpot !== null &&
    internals.approachAudioTriggeredForSpotId !== nextSpot.id;

  if (shouldTriggerApproachAudio && nextSpot) {
    internals = {
      ...internals,
      approachAudioTriggeredForSpotId: nextSpot.id,
    };
  }

  const traversedFraction = snapped
    ? Math.min(1, snapped.distanceAlongRouteM / internals.routeLengthM)
    : 0;

  const distanceOffRouteM = distanceToRouteM(routeCoordinates, smoothed);
  const displayBearing = resolveDisplayBearing({
    snapped,
    heading: fix.heading,
    speed: fix.speed,
  });

  const status: NavigationStatus = proximityResult.shouldMarkArrived
    ? "arrived"
    : offRouteTracker.isOffRoute
      ? "offRoute"
      : "tracking";

  return {
    snapshot: buildSnapshotFromState({
      status,
      rawLocation: { lat: fix.lat, lng: fix.lng },
      smoothed,
      snapped,
      displayBearing,
      proximity: proximityResult.proximity,
      distanceOffRouteM,
      traversedFraction,
      walkTrail: internals.walkTrail,
    }),
    internals,
    shouldTriggerApproachAudio,
    shouldTriggerOffRouteVoice:
      !wasOffRoute && offRouteTracker.isOffRoute,
    shouldMarkArrived: proximityResult.shouldMarkArrived,
    arrivedSpotId: proximityResult.proximity.arrivedSpotId,
  };
}

export function processLocationUpdate(input: {
  fix: RawGpsFix;
  routeCoordinates: GeoPoint[];
  orderedSpots: BundleSpot[];
  completedSpotIds: Set<string>;
  internals: NavigationSessionInternals;
  thresholds?: NavigationThresholds;
}): LocationUpdateResult {
  const thresholds = input.thresholds ?? DEFAULT_NAVIGATION_THRESHOLDS;
  let internals = input.internals;
  const wasOffRoute = internals.offRouteTracker.isOffRoute;
  const rawPoint = { lat: input.fix.lat, lng: input.fix.lng };

  if (
    shouldRejectGpsFix(
      input.fix,
      thresholds.maxAccuracyM,
      internals.smoothState.lastAccepted,
    )
  ) {
    const smoothed = internals.smoothState.smoothed ?? rawPoint;

    return finalizeUpdate({
      fix: input.fix,
      routeCoordinates: input.routeCoordinates,
      orderedSpots: input.orderedSpots,
      completedSpotIds: input.completedSpotIds,
      internals,
      thresholds,
      wasOffRoute,
      smoothed,
      walkTrail: internals.walkTrail,
    });
  }

  internals = {
    ...internals,
    smoothState: smoothLocation(
      internals.smoothState,
      input.fix,
      thresholds.locationSmoothAlpha,
    ),
  };

  const smoothed = internals.smoothState.smoothed!;
  const walkTrail =
    hasMovedEnough(
      internals.walkTrail[internals.walkTrail.length - 1] ?? null,
      smoothed,
      thresholds.minMovementM,
    )
      ? appendWalkTrail(internals.walkTrail, smoothed)
      : internals.walkTrail.length === 0
        ? appendWalkTrail(internals.walkTrail, smoothed)
        : internals.walkTrail;

  return finalizeUpdate({
    fix: input.fix,
    routeCoordinates: input.routeCoordinates,
    orderedSpots: input.orderedSpots,
    completedSpotIds: input.completedSpotIds,
    internals,
    thresholds,
    wasOffRoute,
    smoothed,
    walkTrail,
  });
}

export function processBootstrapLocation(input: {
  fix: RawGpsFix;
  routeCoordinates: GeoPoint[];
  orderedSpots: BundleSpot[];
  completedSpotIds: Set<string>;
  internals: NavigationSessionInternals;
  thresholds?: NavigationThresholds;
}): LocationUpdateResult {
  const thresholds = input.thresholds ?? DEFAULT_NAVIGATION_THRESHOLDS;
  let internals = input.internals;

  if (!isFixAccuracyAcceptable(input.fix, thresholds.maxAccuracyM)) {
    return {
      snapshot: {
        status: "tracking",
        rawLocation: { lat: input.fix.lat, lng: input.fix.lng },
        snappedLocation: null,
        displayLocation: { lat: input.fix.lat, lng: input.fix.lng },
        displayBearing: 0,
        proximity: {
          approachSpotId: null,
          arrivedSpotId: null,
          distanceToNextStopM: null,
        },
        distanceOffRouteM: distanceToRouteM(input.routeCoordinates, {
          lat: input.fix.lat,
          lng: input.fix.lng,
        }),
        traversedFraction: 0,
        walkTrail: [],
      },
      internals,
      shouldTriggerApproachAudio: false,
      shouldTriggerOffRouteVoice: false,
      shouldMarkArrived: false,
      arrivedSpotId: null,
    };
  }

  internals = {
    ...internals,
    smoothState: smoothLocation(internals.smoothState, input.fix, 1),
  };

  const smoothed = internals.smoothState.smoothed!;

  return finalizeUpdate({
    fix: input.fix,
    routeCoordinates: input.routeCoordinates,
    orderedSpots: input.orderedSpots,
    completedSpotIds: input.completedSpotIds,
    internals,
    thresholds,
    wasOffRoute: false,
    smoothed,
    walkTrail: appendWalkTrail([], smoothed),
  });
}

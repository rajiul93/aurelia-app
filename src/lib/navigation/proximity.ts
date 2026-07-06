import type { BundleSpot, GeoPoint } from "@/types/bundle-content";

import { distanceBetweenPointsM } from "./snap-to-route";
import type { NavigationThresholds, ProximityState } from "./types";

function getSpotPoint(spot: BundleSpot): GeoPoint | null {
  if (spot.latitude === null || spot.longitude === null) {
    return null;
  }

  return { lat: spot.latitude, lng: spot.longitude };
}

export function getNextIncompleteSpot(
  orderedSpots: BundleSpot[],
  completedSpotIds: Set<string>,
) {
  return orderedSpots.find((spot) => !completedSpotIds.has(spot.id)) ?? null;
}

export type ArrivalDwellState = {
  spotId: string | null;
  enteredAt: number | null;
};

export function createArrivalDwellState(): ArrivalDwellState {
  return {
    spotId: null,
    enteredAt: null,
  };
}

export function evaluateProximity(
  location: GeoPoint,
  nextSpot: BundleSpot | null,
  thresholds: NavigationThresholds,
  dwellState: ArrivalDwellState,
  now = Date.now(),
): {
  proximity: ProximityState;
  dwellState: ArrivalDwellState;
  shouldTriggerApproachAudio: boolean;
  shouldMarkArrived: boolean;
} {
  const nextPoint = nextSpot ? getSpotPoint(nextSpot) : null;

  if (!nextSpot || !nextPoint) {
    return {
      proximity: {
        approachSpotId: null,
        arrivedSpotId: null,
        distanceToNextStopM: null,
      },
      dwellState: createArrivalDwellState(),
      shouldTriggerApproachAudio: false,
      shouldMarkArrived: false,
    };
  }

  const distanceToNextStopM = distanceBetweenPointsM(location, nextPoint);
  const withinApproach = distanceToNextStopM <= thresholds.approachRadiusM;
  const withinArrival = distanceToNextStopM <= thresholds.arrivalRadiusM;
  const withinDwell =
    distanceToNextStopM <= thresholds.arrivalDwellRadiusM;

  let nextDwell = dwellState;

  if (withinDwell) {
    if (dwellState.spotId !== nextSpot.id || dwellState.enteredAt === null) {
      nextDwell = { spotId: nextSpot.id, enteredAt: now };
    }
  } else {
    nextDwell = createArrivalDwellState();
  }

  const dwellElapsed =
    nextDwell.enteredAt !== null ? now - nextDwell.enteredAt : 0;
  const shouldMarkArrived =
    withinArrival ||
    (nextDwell.enteredAt !== null && dwellElapsed >= thresholds.arrivalDwellMs);

  return {
    proximity: {
      approachSpotId: withinApproach ? nextSpot.id : null,
      arrivedSpotId: shouldMarkArrived ? nextSpot.id : null,
      distanceToNextStopM,
    },
    dwellState: nextDwell,
    shouldTriggerApproachAudio: withinApproach,
    shouldMarkArrived,
  };
}

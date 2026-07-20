import { create } from "zustand";

import length from "@turf/length";
import { lineString } from "@turf/helpers";

import {
  createNavigationSessionInternals,
  hasLocationFix,
  processBootstrapLocation,
  processLocationUpdate,
  type NavigationSessionInternals,
  type NavigationSessionSnapshot,
} from "@/lib/navigation/process-location-update";
import type { GeoPoint } from "@/types/bundle-content";
import type { BundleSpot } from "@/types/bundle-content";
import type { RawGpsFix } from "@/lib/navigation/types";

type NavigationSessionState = {
  tourId: string | null;
  routeCoordinates: GeoPoint[];
  orderedSpots: BundleSpot[];
  completedSpotIds: Set<string>;
  internals: NavigationSessionInternals | null;
  snapshot: NavigationSessionSnapshot | null;
  isTracking: boolean;
  startSession: (input: {
    tourId: string;
    routeCoordinates: GeoPoint[];
    orderedSpots: BundleSpot[];
    completedSpotIds: string[];
  }) => void;
  stopSession: () => void;
  setCompletedSpotIds: (spotIds: string[]) => void;
  ingestBootstrapFix: (
    fix: RawGpsFix,
  ) => ReturnType<typeof processBootstrapLocation> | null;
  ingestFix: (fix: RawGpsFix) => ReturnType<typeof processLocationUpdate> | null;
  reset: () => void;
};

function buildRouteLengthM(routeCoordinates: GeoPoint[]) {
  if (routeCoordinates.length < 2) {
    return 1;
  }

  return Math.max(
    length(
      lineString(routeCoordinates.map((point) => [point.lng, point.lat])),
      { units: "meters" },
    ),
    1,
  );
}

const idleSnapshot: NavigationSessionSnapshot = {
  status: "idle",
  rawLocation: null,
  snappedLocation: null,
  displayLocation: null,
  displayBearing: 0,
  proximity: {
    approachSpotId: null,
    arrivedSpotId: null,
    distanceToNextStopM: null,
  },
  distanceOffRouteM: 0,
  traversedFraction: 0,
  walkTrail: [],
};

function applyLocationResult(
  result:
    | ReturnType<typeof processLocationUpdate>
    | ReturnType<typeof processBootstrapLocation>,
) {
  return {
    internals: result.internals,
    snapshot: result.snapshot,
    result,
  };
}

export const useNavigationSessionStore = create<NavigationSessionState>(
  (set, get) => ({
    tourId: null,
    routeCoordinates: [],
    orderedSpots: [],
    completedSpotIds: new Set<string>(),
    internals: null,
    snapshot: idleSnapshot,
    isTracking: false,

    startSession({ tourId, routeCoordinates, orderedSpots, completedSpotIds }) {
      const routeLengthM = buildRouteLengthM(routeCoordinates);

      set({
        tourId,
        routeCoordinates,
        orderedSpots,
        completedSpotIds: new Set(completedSpotIds),
        internals: createNavigationSessionInternals(
          routeCoordinates,
          routeLengthM,
        ),
        snapshot: {
          ...idleSnapshot,
          status: "tracking",
        },
        isTracking: true,
      });
    },

    stopSession() {
      set({ isTracking: false });
    },

    setCompletedSpotIds(spotIds) {
      set({ completedSpotIds: new Set(spotIds) });
    },

    ingestBootstrapFix(fix) {
      const state = get();

      if (!state.isTracking || !state.internals) {
        return null;
      }

      // The bootstrap fix exists only to fill the gap before the first watch
      // update, and it is resolved in parallel with the watch — so it can land
      // late. Applying it then would not merely nudge the marker: the
      // poor-accuracy branch of processBootstrapLocation returns an empty
      // walkTrail, a null snappedLocation and zero progress, wiping the walk.
      // Once any fix has arrived this one is obsolete regardless of timestamps
      // (last-known is by definition older, and a live fix always beats it).
      if (hasLocationFix(state.snapshot)) {
        return null;
      }

      const result = processBootstrapLocation({
        fix,
        routeCoordinates: state.routeCoordinates,
        orderedSpots: state.orderedSpots,
        completedSpotIds: state.completedSpotIds,
        internals: state.internals,
      });

      const applied = applyLocationResult(result);
      set({
        internals: applied.internals,
        snapshot: applied.snapshot,
      });

      return applied.result;
    },

    ingestFix(fix) {
      const state = get();

      if (!state.isTracking || !state.internals) {
        return null;
      }

      const result = processLocationUpdate({
        fix,
        routeCoordinates: state.routeCoordinates,
        orderedSpots: state.orderedSpots,
        completedSpotIds: state.completedSpotIds,
        internals: state.internals,
      });

      const applied = applyLocationResult(result);
      set({
        internals: applied.internals,
        snapshot: applied.snapshot,
      });

      return applied.result;
    },

    reset() {
      set({
        tourId: null,
        routeCoordinates: [],
        orderedSpots: [],
        completedSpotIds: new Set<string>(),
        internals: null,
        snapshot: idleSnapshot,
        isTracking: false,
      });
    },
  }),
);

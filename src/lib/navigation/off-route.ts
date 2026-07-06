import distance from "@turf/distance";
import { lineString, point } from "@turf/helpers";
import pointToLineDistance from "@turf/point-to-line-distance";

import type { GeoPoint } from "@/types/bundle-content";

export function distanceToRouteM(
  routeCoordinates: GeoPoint[],
  location: GeoPoint,
) {
  if (routeCoordinates.length < 2) {
    if (routeCoordinates.length === 1) {
      return distance(
        point([location.lng, location.lat]),
        point([routeCoordinates[0]!.lng, routeCoordinates[0]!.lat]),
        { units: "meters" },
      );
    }

    return 0;
  }

  const line = lineString(
    routeCoordinates.map((coord) => [coord.lng, coord.lat]),
  );

  return pointToLineDistance(point([location.lng, location.lat]), line, {
    units: "meters",
  });
}

export function isOffRoute(
  routeCoordinates: GeoPoint[],
  location: GeoPoint,
  thresholdM: number,
) {
  return distanceToRouteM(routeCoordinates, location) > thresholdM;
}

export type OffRouteTracker = {
  consecutiveOnRoute: number;
  isOffRoute: boolean;
};

export function createOffRouteTracker(): OffRouteTracker {
  return {
    consecutiveOnRoute: 0,
    isOffRoute: false,
  };
}

export function updateOffRouteTracker(
  tracker: OffRouteTracker,
  routeCoordinates: GeoPoint[],
  location: GeoPoint,
  thresholdM: number,
  clearCount: number,
): OffRouteTracker {
  const offRouteNow = isOffRoute(routeCoordinates, location, thresholdM);

  if (offRouteNow) {
    return {
      consecutiveOnRoute: 0,
      isOffRoute: true,
    };
  }

  const consecutiveOnRoute = tracker.consecutiveOnRoute + 1;

  return {
    consecutiveOnRoute,
    isOffRoute:
      tracker.isOffRoute && consecutiveOnRoute < clearCount
        ? true
        : false,
  };
}

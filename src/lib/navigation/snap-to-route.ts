import bearing from "@turf/bearing";
import distance from "@turf/distance";
import length from "@turf/length";
import { lineString, point } from "@turf/helpers";
import nearestPointOnLine from "@turf/nearest-point-on-line";

import type { GeoPoint } from "@/types/bundle-content";

import type { SnappedPosition } from "./types";

export function snapToRoute(
  routeCoordinates: GeoPoint[],
  location: GeoPoint,
): SnappedPosition | null {
  if (routeCoordinates.length < 2) {
    if (routeCoordinates.length === 1) {
      return {
        ...routeCoordinates[0]!,
        distanceAlongRouteM: 0,
        routeIndex: 0,
        bearing: 0,
      };
    }

    return null;
  }

  const line = lineString(
    routeCoordinates.map((coord) => [coord.lng, coord.lat]),
  );
  const nearest = nearestPointOnLine(line, point([location.lng, location.lat]));
  const snappedLng = nearest.geometry.coordinates[0]!;
  const snappedLat = nearest.geometry.coordinates[1]!;
  const routeIndex = nearest.properties.index ?? 0;

  const traversedLine = lineString(
    routeCoordinates
      .slice(0, routeIndex + 2)
      .map((coord) => [coord.lng, coord.lat]),
  );
  const distanceAlongRouteM = length(traversedLine, { units: "meters" });

  const nextIndex = Math.min(routeIndex + 1, routeCoordinates.length - 1);
  const nextPoint = routeCoordinates[nextIndex]!;
  const routeBearing = bearing(
    point([snappedLng, snappedLat]),
    point([nextPoint.lng, nextPoint.lat]),
  );

  return {
    lat: snappedLat,
    lng: snappedLng,
    distanceAlongRouteM,
    routeIndex,
    bearing: Number.isFinite(routeBearing) ? routeBearing : 0,
  };
}

export function distanceBetweenPointsM(left: GeoPoint, right: GeoPoint) {
  return distance(point([left.lng, left.lat]), point([right.lng, right.lat]), {
    units: "meters",
  });
}

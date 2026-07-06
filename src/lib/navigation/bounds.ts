import type { GeoPoint } from "@/types/bundle-content";

import type { MapBounds } from "./types";

const DEFAULT_PADDING_DEGREES = 0.002;

export function computeMapBounds(
  points: GeoPoint[],
  paddingDegrees = DEFAULT_PADDING_DEGREES,
): MapBounds | null {
  if (points.length === 0) {
    return null;
  }

  let north = points[0]!.lat;
  let south = points[0]!.lat;
  let east = points[0]!.lng;
  let west = points[0]!.lng;

  for (const point of points) {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lng);
    west = Math.min(west, point.lng);
  }

  return {
    north: north + paddingDegrees,
    south: south - paddingDegrees,
    east: east + paddingDegrees,
    west: west - paddingDegrees,
  };
}

export function boundsToMapLibre(bounds: MapBounds): [[number, number], [number, number]] {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.north],
  ];
}

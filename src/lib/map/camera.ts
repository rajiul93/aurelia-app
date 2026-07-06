import type { LngLatBounds } from "@maplibre/maplibre-react-native";

import { computeMapBounds } from "@/lib/navigation/bounds";
import type { MapBounds } from "@/lib/navigation/types";
import type { GeoPoint } from "@/types/bundle-content";

export const MAP_CAMERA_PADDING = {
  top: 80,
  bottom: 160,
  left: 32,
  right: 32,
} as const;

export function mapBoundsToLngLatBounds(bounds: MapBounds): LngLatBounds {
  return [bounds.west, bounds.south, bounds.east, bounds.north];
}

export function getRouteMapBounds(points: GeoPoint[]) {
  return computeMapBounds(points, 0.003);
}

export function mergeBoundsWithPoint(bounds: MapBounds, point: GeoPoint): MapBounds {
  const padding = 0.0015;

  return {
    north: Math.max(bounds.north, point.lat + padding),
    south: Math.min(bounds.south, point.lat - padding),
    east: Math.max(bounds.east, point.lng + padding),
    west: Math.min(bounds.west, point.lng - padding),
  };
}

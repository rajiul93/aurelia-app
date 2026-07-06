import type { BundleContent, GeoPoint } from "@/types/bundle-content";

import { buildRouteCoordinates } from "./route-geometry";
import { computeMapBounds } from "./bounds";

function hasValidFootprint(footprintGeo: GeoPoint[] | null | undefined) {
  return Array.isArray(footprintGeo) && footprintGeo.length >= 2;
}

export function hasCompleteSpotCoordinates(content: BundleContent) {
  return (
    content.tour.spots.length > 0 &&
    content.tour.spots.every(
      (spot) =>
        spot.latitude !== null &&
        spot.longitude !== null &&
        Number.isFinite(spot.latitude) &&
        Number.isFinite(spot.longitude),
    )
  );
}

export function hasCompleteRouteFootprints(content: BundleContent) {
  if (content.tour.spots.length <= 1) {
    return true;
  }

  const edges = content.route?.edges ?? [];
  const expectedEdges = content.tour.spots.length - 1;

  if (edges.length < expectedEdges) {
    return false;
  }

  return edges.every((edge) => hasValidFootprint(edge.footprintGeo));
}

export function hasNavigationGeoData(content: BundleContent) {
  const coordinates = buildRouteCoordinates(
    content.tour.spots,
    content.route,
  );

  return coordinates.length >= 2 && hasCompleteSpotCoordinates(content);
}

export function buildNavigationMeta(content: BundleContent) {
  const coordinates = buildRouteCoordinates(
    content.tour.spots,
    content.route,
  );

  return {
    mapBounds: computeMapBounds(coordinates),
    hasCompleteFootprints: hasCompleteRouteFootprints(content),
    hasCompleteCoordinates: hasCompleteSpotCoordinates(content),
  };
}

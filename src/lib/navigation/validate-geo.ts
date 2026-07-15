import { getAllFloorScopes, getFloorScope } from "@/lib/bundle/floor-routing";
import type { BundleContent, BundleSpot, GeoPoint } from "@/types/bundle-content";

import { buildRouteCoordinates } from "./route-geometry";
import { computeMapBounds } from "./bounds";

function hasValidFootprint(footprintGeo: GeoPoint[] | null | undefined) {
  return Array.isArray(footprintGeo) && footprintGeo.length >= 2;
}

function spotsHaveCoordinates(spots: BundleSpot[]) {
  return (
    spots.length > 0 &&
    spots.every(
      (spot) =>
        spot.latitude !== null &&
        spot.longitude !== null &&
        Number.isFinite(spot.latitude) &&
        Number.isFinite(spot.longitude),
    )
  );
}

export function hasCompleteSpotCoordinates(
  content: BundleContent,
  floorId?: string,
) {
  return spotsHaveCoordinates(getFloorScope(content, floorId).spots);
}

export function hasCompleteRouteFootprints(
  content: BundleContent,
  floorId?: string,
) {
  const { spots, route } = getFloorScope(content, floorId);

  if (spots.length <= 1) {
    return true;
  }

  const edges = route?.edges ?? [];
  const expectedEdges = spots.length - 1;

  if (edges.length < expectedEdges) {
    return false;
  }

  return edges.every((edge) => hasValidFootprint(edge.footprintGeo));
}

export function hasNavigationGeoData(content: BundleContent, floorId?: string) {
  const { spots, route } = getFloorScope(content, floorId);
  const coordinates = buildRouteCoordinates(spots, route);

  return coordinates.length >= 2 && spotsHaveCoordinates(spots);
}

/**
 * Meta for the whole tour, not one floor: the offline map pack has to cover every
 * floor's geography, and a tour is only "complete" if all of its floors are.
 */
export function buildNavigationMeta(content: BundleContent) {
  const scopes = getAllFloorScopes(content);
  const coordinates = scopes.flatMap((scope) =>
    buildRouteCoordinates(scope.spots, scope.route),
  );

  return {
    mapBounds: computeMapBounds(coordinates),
    hasCompleteFootprints: scopes.every((scope) =>
      hasCompleteRouteFootprints(content, scope.floorId),
    ),
    hasCompleteCoordinates: scopes.every((scope) =>
      spotsHaveCoordinates(scope.spots),
    ),
  };
}

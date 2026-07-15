import type {
  BundleContent,
  BundleRoute,
  BundleSpot,
} from "@/types/bundle-content";

import { getAllFloorScopes } from "./floor-routing";

/**
 * Every stop in the tour, walking order: floor by floor, and within a floor in
 * that floor's route order. This is the whole-tour list — the stop list and the
 * prev/next arrows on a spot, which cross floors. Navigation itself stays on one
 * floor and uses `orderSpotsByRoute` with that floor's scope.
 */
export function orderSpotsAcrossFloors(content: BundleContent): BundleSpot[] {
  return getAllFloorScopes(content).flatMap((scope) =>
    orderSpotsByRoute(scope.spots, scope.route),
  );
}

export function orderSpotsByRoute(
  spots: BundleSpot[],
  route: BundleRoute | null,
) {
  if (!route?.edges.length) {
    return [...spots].sort((left, right) => left.sortOrder - right.sortOrder);
  }

  const spotById = new Map(spots.map((spot) => [spot.id, spot]));
  const edges = [...route.edges].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  const ordered: BundleSpot[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    for (const spotId of [edge.fromSpotId, edge.toSpotId]) {
      if (seen.has(spotId)) {
        continue;
      }

      const spot = spotById.get(spotId);
      if (spot) {
        ordered.push(spot);
        seen.add(spotId);
      }
    }
  }

  for (const spot of [...spots].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )) {
    if (!seen.has(spot.id)) {
      ordered.push(spot);
    }
  }

  return ordered;
}

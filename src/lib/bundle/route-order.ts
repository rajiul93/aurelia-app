import type { BundleRoute, BundleSpot } from "@/types/bundle-content";

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

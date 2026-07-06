import type { Feature, LineString } from "geojson";

import type {
  BundleContent,
  BundleRoute,
  BundleSpot,
  GeoPoint,
} from "@/types/bundle-content";

function isValidPoint(point: GeoPoint | null | undefined) {
  return (
    point !== null &&
    point !== undefined &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );
}

function straightLine(from: GeoPoint, to: GeoPoint): GeoPoint[] {
  return [from, to];
}

function getSpotPoint(spot: BundleSpot): GeoPoint | null {
  if (spot.latitude === null || spot.longitude === null) {
    return null;
  }

  return { lat: spot.latitude, lng: spot.longitude };
}

export function buildRouteCoordinates(
  spots: BundleSpot[],
  route: BundleRoute | null,
): GeoPoint[] {
  if (!route?.edges.length) {
    const ordered = [...spots].sort((left, right) => left.sortOrder - right.sortOrder);
    return ordered
      .map(getSpotPoint)
      .filter((point): point is GeoPoint => isValidPoint(point));
  }

  const spotById = new Map(spots.map((spot) => [spot.id, spot]));
  const edges = [...route.edges].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  const coordinates: GeoPoint[] = [];

  for (const edge of edges) {
    const fromSpot = spotById.get(edge.fromSpotId);
    const toSpot = spotById.get(edge.toSpotId);
    const fromPoint = fromSpot ? getSpotPoint(fromSpot) : null;
    const toPoint = toSpot ? getSpotPoint(toSpot) : null;

    const segment =
      edge.footprintGeo && edge.footprintGeo.length >= 2
        ? edge.footprintGeo.filter(isValidPoint)
        : fromPoint && toPoint
          ? straightLine(fromPoint, toPoint)
          : [];

    if (segment.length === 0) {
      continue;
    }

    if (coordinates.length === 0) {
      coordinates.push(...segment);
      continue;
    }

    const last = coordinates[coordinates.length - 1]!;
    const first = segment[0]!;
    if (last.lat === first.lat && last.lng === first.lng) {
      coordinates.push(...segment.slice(1));
    } else {
      coordinates.push(...segment);
    }
  }

  return coordinates;
}

export function buildRouteLineString(content: BundleContent): Feature<LineString> {
  const coordinates = buildRouteCoordinates(
    content.tour.spots,
    content.route,
  ).map((point) => [point.lng, point.lat] as [number, number]);

  return {
    type: "Feature",
    properties: {
      tourId: content.tour.id,
    },
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

export function splitRouteAtIndex(
  coordinates: GeoPoint[],
  routeIndex: number,
): { completed: GeoPoint[]; upcoming: GeoPoint[] } {
  if (coordinates.length === 0) {
    return { completed: [], upcoming: [] };
  }

  const safeIndex = Math.max(0, Math.min(routeIndex, coordinates.length - 1));
  return {
    completed: coordinates.slice(0, safeIndex + 1),
    upcoming: coordinates.slice(safeIndex),
  };
}

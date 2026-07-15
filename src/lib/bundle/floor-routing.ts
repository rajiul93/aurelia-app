/**
 * Reading floors out of a tour bundle.
 *
 * Two bundle shapes are in the wild and both must keep working:
 * - v1: one `content.route`, no `floors` — what older installs on disk look like.
 * - v2: `content.floors[]`, each floor owning its route.
 */

import type {
  BundleContent,
  BundleFloor,
  BundleRoute,
  BundleSpot,
} from "@/types/bundle-content";
import type { AudienceType } from "@/constants/audiences";
import type { AppLanguage } from "@/store/locale-store";

function floorsOf(content: BundleContent): BundleFloor[] {
  return content.floors ?? [];
}

export function findFloor(
  content: BundleContent,
  floorId: string,
): BundleFloor | null {
  return floorsOf(content).find((floor) => floor.id === floorId) ?? null;
}

export function getRouteForFloor(
  content: BundleContent,
  floorId: string,
): BundleRoute | null {
  if (floorsOf(content).length > 0) {
    return findFloor(content, floorId)?.route ?? null;
  }

  return content.route ?? null;
}

/** "" for a v1 bundle, which has no floor ids at all. */
export function getDefaultFloorId(content: BundleContent): string {
  return floorsOf(content)[0]?.id ?? "";
}

export function getFloorIds(content: BundleContent): string[] {
  return floorsOf(content).map((floor) => floor.id);
}

export function isMultiFloor(content: BundleContent): boolean {
  return floorsOf(content).length > 1;
}

/**
 * The spots that sit on one floor.
 *
 * Spots are flat at `content.tour.spots`, so they have to be matched back to their
 * floor. Newer bundles carry `spot.floorId`; older ones only carry `spot.floor`,
 * the floor's number — hence the two-step match.
 */
export function getSpotsForFloor(
  content: BundleContent,
  floorId: string,
): BundleSpot[] {
  const spots = content.tour.spots;

  // v1 bundle, or no floor asked for: the tour is one flat floor.
  if (!floorId || floorsOf(content).length === 0) {
    return spots;
  }

  const floor = findFloor(content, floorId);
  if (!floor) {
    return [];
  }

  return spots.filter((spot) =>
    spot.floorId ? spot.floorId === floorId : spot.floor === floor.floorNo,
  );
}

/** One floor's spots and route — everything the map and the walk run on. */
export type FloorScope = {
  floorId: string;
  spots: BundleSpot[];
  route: BundleRoute | null;
};

/**
 * The floor a screen is working on. Omitting `floorId` means "the first floor",
 * which is also the only floor of a single-floor tour and the whole of a v1
 * bundle — so callers that have no floor picker still get a coherent scope.
 */
export function getFloorScope(
  content: BundleContent,
  floorId?: string,
): FloorScope {
  const resolved = floorId || getDefaultFloorId(content);

  return {
    floorId: resolved,
    spots: getSpotsForFloor(content, resolved),
    route: getRouteForFloor(content, resolved),
  };
}

/** Every route in the bundle: v2's one-per-floor, or v1's single top-level one. */
export function getAllRoutes(content: BundleContent): BundleRoute[] {
  const floors = floorsOf(content);

  if (floors.length === 0) {
    return content.route ? [content.route] : [];
  }

  return floors
    .map((floor) => floor.route)
    .filter((route): route is BundleRoute => route !== null);
}

/** Every floor's scope, in floor order. A v1 bundle yields one flat scope. */
export function getAllFloorScopes(content: BundleContent): FloorScope[] {
  const floors = floorsOf(content);

  if (floors.length === 0) {
    return [{ floorId: "", spots: content.tour.spots, route: content.route ?? null }];
  }

  return [...floors]
    .sort((left, right) => left.floorNo - right.floorNo)
    .map((floor) => getFloorScope(content, floor.id));
}

/**
 * The floor's name in the reader's language, falling back through audience and
 * then English. Returns null when the bundle predates floor names — callers
 * should show "Floor {floorNo}" instead of inventing one.
 */
export function getFloorName(
  floor: BundleFloor,
  language: AppLanguage,
  audience: AudienceType,
): string | null {
  const translations = floor.translations ?? [];
  if (translations.length === 0) {
    return null;
  }

  const exact = translations.find(
    (entry) => entry.language === language && entry.audience === audience,
  );

  const sameLanguage = translations.find(
    (entry) => entry.language === language,
  );

  const english = translations.find((entry) => entry.language === "en");

  return (
    exact?.name ?? sameLanguage?.name ?? english?.name ?? translations[0]!.name
  );
}

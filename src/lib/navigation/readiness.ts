import { getFloorScope } from "@/lib/bundle/floor-routing";
import type { BundleContent } from "@/types/bundle-content";

import { buildRouteCoordinates } from "./route-geometry";
import { hasCompleteSpotCoordinates } from "./validate-geo";

export type NavigationBlockReason =
  | "gps_disabled"
  | "missing_coordinates"
  | "insufficient_route"
  | null;

export function getNavigationBlockReason(
  content: BundleContent,
  enableGpsNavigation: boolean,
  floorId?: string,
): NavigationBlockReason {
  if (!enableGpsNavigation) {
    return "gps_disabled";
  }

  if (!hasCompleteSpotCoordinates(content, floorId)) {
    return "missing_coordinates";
  }

  const { spots, route } = getFloorScope(content, floorId);
  const coordinates = buildRouteCoordinates(spots, route);

  if (coordinates.length < 2) {
    return "insufficient_route";
  }

  return null;
}

export function canStartGuidedWalk(
  content: BundleContent,
  enableGpsNavigation: boolean,
  floorId?: string,
) {
  return getNavigationBlockReason(content, enableGpsNavigation, floorId) === null;
}

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
): NavigationBlockReason {
  if (!enableGpsNavigation) {
    return "gps_disabled";
  }

  if (!hasCompleteSpotCoordinates(content)) {
    return "missing_coordinates";
  }

  const coordinates = buildRouteCoordinates(
    content.tour.spots,
    content.route,
  );

  if (coordinates.length < 2) {
    return "insufficient_route";
  }

  return null;
}

export function canStartGuidedWalk(
  content: BundleContent,
  enableGpsNavigation: boolean,
) {
  return getNavigationBlockReason(content, enableGpsNavigation) === null;
}

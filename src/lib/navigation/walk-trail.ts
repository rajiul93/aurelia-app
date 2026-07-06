import type { GeoPoint } from "@/types/bundle-content";

import { distanceBetweenPointsM } from "./snap-to-route";

export const WALK_TRAIL_MIN_GAP_M = 2;
export const WALK_TRAIL_MAX_POINTS = 1500;

export function appendWalkTrail(
  trail: GeoPoint[],
  point: GeoPoint,
  minGapM = WALK_TRAIL_MIN_GAP_M,
): GeoPoint[] {
  const last = trail[trail.length - 1];

  if (last && distanceBetweenPointsM(last, point) < minGapM) {
    return trail;
  }

  const next = [...trail, point];

  if (next.length <= WALK_TRAIL_MAX_POINTS) {
    return next;
  }

  return next.slice(next.length - WALK_TRAIL_MAX_POINTS);
}

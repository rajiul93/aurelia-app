import type { SnappedPosition } from "./types";

export function resolveDisplayBearing(input: {
  snapped: SnappedPosition | null;
  heading: number | null;
  speed: number | null;
}) {
  if (
    input.speed !== null &&
    input.speed > 0.4 &&
    input.heading !== null &&
    Number.isFinite(input.heading) &&
    input.heading >= 0
  ) {
    return input.heading;
  }

  return input.snapped?.bearing ?? 0;
}

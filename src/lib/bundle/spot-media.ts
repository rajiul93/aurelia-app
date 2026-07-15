import type { BundleSpot, BundleSpotMedia } from "@/types/bundle-content";

export type SpotMediaType = "IMAGE" | "AUDIO" | "VIDEO";

export function getSpotMediaByType(
  spot: BundleSpot,
  type: SpotMediaType,
): BundleSpotMedia[] {
  return spot.medias
    .filter((media) => media.type === type && media.url)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
    );
}

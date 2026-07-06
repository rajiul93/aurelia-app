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

export function spotHasMedia(spot: BundleSpot) {
  return spot.medias.some((media) => Boolean(media.url));
}

/** @deprecated Use getSpotMediaByType(spot, "AUDIO") */
export function getSpotAudioMedia(spot: BundleSpot): BundleSpotMedia | null {
  return getSpotMediaByType(spot, "AUDIO")[0] ?? null;
}

/** @deprecated Use getSpotMediaByType(spot, "IMAGE") */
export function getSpotHeroImage(spot: BundleSpot): BundleSpotMedia | null {
  return getSpotMediaByType(spot, "IMAGE")[0] ?? null;
}

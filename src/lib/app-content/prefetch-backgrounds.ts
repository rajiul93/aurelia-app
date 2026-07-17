import { Image } from "expo-image";

import { enumerateBackgroundUrls, getCurrentTimeOfDay } from "./resolve-asset";
import type { AppContentBundle } from "@/types/app-content";

/**
 * Warm the background images into expo-image's disk cache.
 *
 * No filesystem cache of our own: expo-image already disk-caches by default
 * (`cachePolicy: 'disk'`), so the bytes persist and are served offline for
 * free. All that was ever missing offline was the *URL*, which the app-content
 * disk snapshot now supplies. This just makes sure the bytes are there before
 * the user needs them, rather than on first paint.
 *
 * The current slot is awaited so it lands first; the other slots follow without
 * blocking, since they aren't on screen. Failures are non-fatal — a miss costs
 * a network fetch later, and AppBackground still has the remote URL.
 */
export async function prefetchBackgrounds(
  assets: AppContentBundle["assets"] | undefined,
  venueTimezone?: string,
): Promise<void> {
  const currentSlot = getCurrentTimeOfDay(venueTimezone);
  const [current, ...others] = enumerateBackgroundUrls(assets, currentSlot);

  if (!current) {
    return;
  }

  try {
    await Image.prefetch(current, "disk");
  } catch {
    // Non-fatal: the <Image> will fetch it on render.
  }

  if (others.length > 0) {
    void Image.prefetch(others, "disk").catch(() => undefined);
  }
}

import { venueWallClock } from "@/lib/host/availability";
import type { AppContentBundle } from "@/types/app-content";

type AppAssets = AppContentBundle["assets"];
export type TimeOfDay = NonNullable<
  AppContentBundle["assets"][string]["timeOfDay"]
>;

export const TIME_OF_DAY_SLOTS: TimeOfDay[] = [
  "MORNING",
  "AFTERNOON",
  "EVENING",
];

function venueHour(timezone: string): number | null {
  const wallClock = venueWallClock(new Date(), timezone);
  if (!wallClock) {
    return null;
  }

  const hour = Number(wallClock.slice(0, 2));
  return Number.isFinite(hour) ? hour : null;
}

/**
 * Which background slot is showing. Read on the *venue's* clock when one is
 * configured: a visitor's phone carries whatever zone they flew in with, so a
 * lunchtime visitor from another continent would otherwise get the night photo
 * while standing in the sun. Falls back to the device clock only when no zone
 * is available (pre-sync) or the runtime can't format one.
 */
export function getCurrentTimeOfDay(venueTimezone?: string): TimeOfDay {
  const venue = venueTimezone ? venueHour(venueTimezone) : null;
  const hour = venue ?? new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "MORNING";
  }

  if (hour >= 12 && hour < 17) {
    return "AFTERNOON";
  }

  return "EVENING";
}

export function resolveAppAssetUrl(
  assets: AppAssets | undefined,
  key: string,
) {
  return assets?.[key]?.url ?? null;
}

/**
 * The background URL for a slot, most specific first. `slot` defaults to the
 * current one on the device clock; pass it explicitly to resolve the venue's
 * slot, or a slot you aren't showing yet (the prefetch does this).
 *
 * The later tiers are deliberately slot-independent: a tenant with a single
 * generic `background` asset resolves the same URL for all three slots, which
 * is why the prefetch de-duplicates.
 */
export function resolveAppBackgroundUrl(
  assets: AppAssets | undefined,
  slot: TimeOfDay = getCurrentTimeOfDay(),
) {
  if (!assets) {
    return null;
  }

  const preferredKeys = [
    `background.${slot.toLowerCase()}`,
    "background",
    "welcome.background",
    "home.background",
  ];

  for (const key of preferredKeys) {
    const url = assets[key]?.url;
    if (url) {
      return url;
    }
  }

  const byTimeOfDay = Object.values(assets).find(
    (asset) => asset.timeOfDay === slot,
  );
  if (byTimeOfDay?.url) {
    return byTimeOfDay.url;
  }

  const fallback = Object.entries(assets).find(([key]) =>
    key.startsWith("background."),
  );

  return fallback?.[1]?.url ?? null;
}

/**
 * Every distinct background URL across the three slots, de-duplicated, current
 * slot first so a caller can prioritise it. May be shorter than three (or
 * empty) when a tenant shares one photo across slots or has none.
 */
export function enumerateBackgroundUrls(
  assets: AppAssets | undefined,
  currentSlot: TimeOfDay = getCurrentTimeOfDay(),
): string[] {
  if (!assets) {
    return [];
  }

  const ordered = [
    currentSlot,
    ...TIME_OF_DAY_SLOTS.filter((slot) => slot !== currentSlot),
  ];

  const urls = ordered
    .map((slot) => resolveAppBackgroundUrl(assets, slot))
    .filter((url): url is string => Boolean(url));

  return [...new Set(urls)];
}

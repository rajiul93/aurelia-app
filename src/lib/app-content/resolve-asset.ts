import type { AppContentBundle } from "@/types/app-content";

type AppAssets = AppContentBundle["assets"];
type TimeOfDay = NonNullable<AppContentBundle["assets"][string]["timeOfDay"]>;

export function getCurrentTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();

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

export function resolveAppBackgroundUrl(assets: AppAssets | undefined) {
  if (!assets) {
    return null;
  }

  const slot = getCurrentTimeOfDay();
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

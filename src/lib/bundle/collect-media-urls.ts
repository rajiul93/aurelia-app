import type { BundleContent } from "@/types/bundle-content";
import type { TourDownloadPreferences } from "@/types/tour-preferences";
import {
  applyTourPreferences,
  filterSpotMedia,
  filterSpotsForPreferences,
} from "@/lib/bundle/content-preferences";

export type MediaDownloadItem = {
  id: string;
  url: string;
};

function addItem(items: MediaDownloadItem[], seen: Set<string>, id: string, url?: string | null) {
  if (!url || seen.has(url)) {
    return;
  }

  seen.add(url);
  items.push({ id, url });
}

export function collectMediaDownloadItems(
  content: BundleContent,
  preferences: TourDownloadPreferences,
) {
  const filtered = applyTourPreferences(content, preferences);
  const items: MediaDownloadItem[] = [];
  const seen = new Set<string>();

  if (filtered.tour.coverMedia && preferences.downloadMode === "FULL") {
    addItem(
      items,
      seen,
      `cover-${filtered.tour.id}`,
      filtered.tour.coverMedia.url,
    );
    addItem(
      items,
      seen,
      `cover-thumb-${filtered.tour.id}`,
      filtered.tour.coverMedia.thumbnail,
    );
  }

  for (const spot of filtered.tour.spots) {
    for (const media of filterSpotMedia(spot.medias, preferences)) {
      addItem(items, seen, media.id, media.url);
      addItem(items, seen, `${media.id}-thumb`, media.thumbnail);
    }
  }

  return items;
}

export function countTourStops(
  content: BundleContent,
  preferences: TourDownloadPreferences,
) {
  return filterSpotsForPreferences(content.tour.spots, preferences).length;
}

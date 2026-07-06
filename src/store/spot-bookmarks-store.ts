import { create } from "zustand";

import {
  loadSpotBookmarksIndex,
  saveSpotBookmarksIndex,
  type SpotBookmarksIndex,
} from "@/lib/spot-bookmarks/storage";

type SpotBookmarksState = {
  byTourId: SpotBookmarksIndex;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleBookmark: (tourId: string, spotId: string) => Promise<void>;
  isBookmarked: (tourId: string, spotId: string) => boolean;
};

export const useSpotBookmarksStore = create<SpotBookmarksState>((set, get) => ({
  byTourId: {},
  hydrated: false,

  async hydrate() {
    const index = await loadSpotBookmarksIndex();
    set({ byTourId: index, hydrated: true });
  },

  async toggleBookmark(tourId, spotId) {
    const current = get().byTourId[tourId] ?? [];
    const bookmarks = new Set(current);

    if (bookmarks.has(spotId)) {
      bookmarks.delete(spotId);
    } else {
      bookmarks.add(spotId);
    }

    const next = {
      ...get().byTourId,
      [tourId]: [...bookmarks],
    };

    await saveSpotBookmarksIndex(next);
    set({ byTourId: next });
  },

  isBookmarked(tourId, spotId) {
    return get().byTourId[tourId]?.includes(spotId) ?? false;
  },
}));

import { create } from "zustand";

import {
  loadTourProgressIndex,
  saveTourProgress,
  type TourProgressRecord,
} from "@/lib/tour-progress/storage";

type TourProgressState = {
  byTourId: Record<string, TourProgressRecord>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleSpotComplete: (tourId: string, spotId: string) => Promise<void>;
  markSpotComplete: (tourId: string, spotId: string) => Promise<void>;
  isSpotComplete: (tourId: string, spotId: string) => boolean;
  getCompletedCount: (tourId: string) => number;
};

export const useTourProgressStore = create<TourProgressState>((set, get) => ({
  byTourId: {},
  hydrated: false,

  async hydrate() {
    const index = await loadTourProgressIndex();
    set({ byTourId: index, hydrated: true });
  },

  async toggleSpotComplete(tourId, spotId) {
    const current = get().byTourId[tourId] ?? { completedSpotIds: [], updatedAt: "" };
    const completed = new Set(current.completedSpotIds);
    if (completed.has(spotId)) {
      completed.delete(spotId);
    } else {
      completed.add(spotId);
    }

    const record: TourProgressRecord = {
      completedSpotIds: [...completed],
      updatedAt: new Date().toISOString(),
    };

    await saveTourProgress(tourId, record);
    set({
      byTourId: {
        ...get().byTourId,
        [tourId]: record,
      },
    });
  },

  async markSpotComplete(tourId, spotId) {
    const current = get().byTourId[tourId] ?? { completedSpotIds: [], updatedAt: "" };
    const completed = new Set(current.completedSpotIds);

    if (completed.has(spotId)) {
      return;
    }

    completed.add(spotId);

    const record: TourProgressRecord = {
      completedSpotIds: [...completed],
      updatedAt: new Date().toISOString(),
    };

    await saveTourProgress(tourId, record);
    set({
      byTourId: {
        ...get().byTourId,
        [tourId]: record,
      },
    });
  },

  isSpotComplete(tourId, spotId) {
    return get().byTourId[tourId]?.completedSpotIds.includes(spotId) ?? false;
  },

  getCompletedCount(tourId) {
    return get().byTourId[tourId]?.completedSpotIds.length ?? 0;
  },
}));

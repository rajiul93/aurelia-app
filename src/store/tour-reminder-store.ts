import { create } from "zustand";

import {
  clearTourReminderSnapshot,
  loadTourReminderSnapshot,
  saveTourReminderSnapshot,
} from "@/lib/tour-reminder/storage";
import {
  emptyReminderEntry,
  type TourReminderEntry,
  type TourReminderMap,
} from "@/lib/tour-reminder/types";

type TourReminderState = {
  byTourId: TourReminderMap;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Merge a patch into a tour's entry (creating it if absent) and persist. */
  upsertEntry: (
    tourId: string,
    patch: Partial<TourReminderEntry>,
  ) => Promise<TourReminderEntry>;
  /** Record the schedule fingerprint the scheduler just committed to the OS. */
  setScheduleKey: (tourId: string, scheduleKey: string | null) => Promise<void>;
  /** Flip a single visit-checklist item and persist. */
  toggleChecklistItem: (tourId: string, itemId: string) => Promise<void>;
  clear: () => Promise<void>;
};

/**
 * On-device reminder state. Kept deliberately dumb: it only stores and persists.
 * Scheduling (OS notifications) and admin-vs-user precedence live in
 * `@/lib/tour-reminder/sync` and `scheduler`, so this store has no dependency on
 * expo-notifications and stays trivially testable.
 */
export const useTourReminderStore = create<TourReminderState>((set, get) => {
  async function persist(byTourId: TourReminderMap) {
    await saveTourReminderSnapshot({ byTourId });
  }

  return {
    byTourId: {},
    hydrated: false,

    async hydrate() {
      const snapshot = await loadTourReminderSnapshot();
      set({ byTourId: snapshot?.byTourId ?? {}, hydrated: true });
    },

    async upsertEntry(tourId, patch) {
      const current = get().byTourId[tourId] ?? emptyReminderEntry();
      const next: TourReminderEntry = { ...current, ...patch };
      const byTourId = { ...get().byTourId, [tourId]: next };

      set({ byTourId });
      await persist(byTourId);
      return next;
    },

    async setScheduleKey(tourId, scheduleKey) {
      const current = get().byTourId[tourId];
      if (!current) {
        return;
      }

      const byTourId = {
        ...get().byTourId,
        [tourId]: { ...current, scheduleKey },
      };
      set({ byTourId });
      await persist(byTourId);
    },

    async toggleChecklistItem(tourId, itemId) {
      const current = get().byTourId[tourId] ?? emptyReminderEntry();
      const checklist = {
        ...current.checklist,
        [itemId]: !current.checklist[itemId],
      };
      const byTourId = {
        ...get().byTourId,
        [tourId]: { ...current, checklist },
      };

      set({ byTourId });
      await persist(byTourId);
    },

    async clear() {
      await clearTourReminderSnapshot();
      set({ byTourId: {} });
    },
  };
});

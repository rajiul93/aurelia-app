import { create } from "zustand";

import {
  installTourBundle,
  listInstalledTourMeta,
  removeInstalledTour,
} from "@/lib/bundle/install";
import type { DownloadProgress } from "@/lib/bundle/download-progress";
import type { InstalledTourMeta, TourBundleDetail } from "@/types/tour-bundle";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

type InstalledToursState = {
  installedByTourId: Record<string, InstalledTourMeta>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  install: (
    bundle: TourBundleDetail,
    tour: { slug: string; title: string },
    options: {
      preferences: TourDownloadPreferences;
      onProgress?: (progress: DownloadProgress) => void;
    },
  ) => Promise<InstalledTourMeta>;
  remove: (tourId: string) => Promise<void>;
};

export const useInstalledToursStore = create<InstalledToursState>(
  (set, get) => ({
    installedByTourId: {},
    hydrated: false,

    async hydrate() {
      // Never let a disk-read hiccup leave the store silently un-hydrated (which
      // would make installed tours look "not installed" offline). Always settle
      // the `hydrated` flag; keep whatever we could read.
      const delays = [0, 100, 300];

      for (const waitMs of delays) {
        if (waitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        try {
          const installed = await listInstalledTourMeta();

          set({
            installedByTourId: Object.fromEntries(
              installed.map((entry) => [entry.tourId, entry]),
            ),
            hydrated: true,
          });

          if (installed.length > 0) {
            return;
          }
        } catch {
          // Retry while the filesystem settles on cold start.
        }
      }

      set({ hydrated: true });
    },

    async install(bundle, tour, options) {
      const meta = await installTourBundle(bundle, tour, options);

      set({
        installedByTourId: {
          ...get().installedByTourId,
          [meta.tourId]: meta,
        },
      });

      return meta;
    },

    async remove(tourId) {
      await removeInstalledTour(tourId);

      const next = { ...get().installedByTourId };
      delete next[tourId];
      set({ installedByTourId: next });
    },
  }),
);

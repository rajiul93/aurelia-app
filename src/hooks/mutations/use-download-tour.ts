import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import type { DownloadProgress } from "@/lib/bundle/download-progress";
import { downloadService } from "@/services/download.service";
import {
  getStorageShortfallMessage,
  hasEnoughStorageForDownload,
} from "@/lib/storage/tour-storage";
import { useReleaseConfigStore } from "@/store/release-config-store";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

type DownloadTourInput = {
  tourId: string;
  slug: string;
  title: string;
  preferences: TourDownloadPreferences;
  onProgress?: (progress: DownloadProgress) => void;
};

export function useDownloadTour() {
  const queryClient = useQueryClient();
  const install = useInstalledToursStore((state) => state.install);

  return useMutation({
    mutationFn: async ({
      tourId,
      slug,
      title,
      preferences,
      onProgress,
    }: DownloadTourInput) => {
      const maxDownloadSizeMb =
        useReleaseConfigStore.getState().config.remote.maxDownloadSizeMb;
      const requiredBytes = Math.max(
        maxDownloadSizeMb * 1024 * 1024,
        250 * 1024 * 1024,
      );

      if (!hasEnoughStorageForDownload(requiredBytes)) {
        throw new Error(getStorageShortfallMessage(requiredBytes));
      }

      onProgress?.({ phase: "fetch", completed: 0, total: 1 });

      const response = await downloadService.fetchBundle(tourId);

      onProgress?.({ phase: "fetch", completed: 1, total: 1 });

      return install(response.data, { slug, title }, { preferences, onProgress });
    },
    onSuccess: async (meta) => {
      await queryClient.removeQueries({
        queryKey: queryKeys.installedTour.all,
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === queryKeys.installedTour.all[0] &&
          query.queryKey[1] === meta.tourId,
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.summary,
      });
    },
  });
}

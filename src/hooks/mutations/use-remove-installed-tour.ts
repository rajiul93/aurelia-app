import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteTourMediaKey } from "@/lib/crypto/media-key";
import { clearDecryptedMediaCache } from "@/lib/crypto/encrypted-media";
import { queryKeys } from "@/lib/query/keys";
import { removeTourProgress } from "@/lib/tour-progress/storage";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import { useTourProgressStore } from "@/store/tour-progress-store";

export function useRemoveInstalledTour() {
  const queryClient = useQueryClient();
  const remove = useInstalledToursStore((state) => state.remove);

  return useMutation({
    mutationFn: async (tourId: string) => {
      await remove(tourId);
      await removeTourProgress(tourId);
      await deleteTourMediaKey(tourId);
      clearDecryptedMediaCache(tourId);
    },
    onSuccess: async (_result, tourId) => {
      const progress = useTourProgressStore.getState().byTourId;
      if (progress[tourId]) {
        const next = { ...progress };
        delete next[tourId];
        useTourProgressStore.setState({ byTourId: next });
      }

      await queryClient.removeQueries({
        queryKey: queryKeys.installedTour.all,
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === queryKeys.installedTour.all[0] &&
          query.queryKey[1] === tourId,
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.summary,
      });
    },
  });
}

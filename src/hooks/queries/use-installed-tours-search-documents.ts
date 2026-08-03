import { useQuery } from "@tanstack/react-query";

import { loadInstalledTourSearchDocuments } from "@/lib/bundle/load";
import { queryKeys } from "@/lib/query/keys";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import type { SearchDocument } from "@/types/tour-bundle";

/**
 * The search corpus of every installed tour, merged.
 *
 * The Assistant tab is not tour-scoped, so it pulls from all downloaded tours at
 * once — without this it can only answer from the global FAQ/knowledge pack and
 * knows nothing about any tour's content.
 *
 * Each tour's documents are narrowed to the audience it was downloaded with. A
 * bundle carries every audience variant of every spot, so skipping this would
 * put 4 near-identical copies of each spot into the ranking and let the top-3
 * results be the same stop four times over.
 */
export function useInstalledToursSearchDocuments(enabled = true) {
  const installedByTourId = useInstalledToursStore(
    (state) => state.installedByTourId,
  );
  const installed = Object.values(installedByTourId);
  const tourIds = installed
    .map((meta) => meta.tourId)
    .sort()
    .join(",");

  return useQuery({
    queryKey: queryKeys.installedTour.searchAll(tourIds),
    queryFn: async () => {
      const perTour = await Promise.all(
        installed.map(async (meta) => {
          try {
            const documents = await loadInstalledTourSearchDocuments(
              meta.tourId,
            );
            const audience = meta.downloadPreferences?.audience;

            return audience
              ? documents.filter((document) => document.audience === audience)
              : documents;
          } catch {
            // One unreadable tour must not blank the whole assistant.
            return [] as SearchDocument[];
          }
        }),
      );

      return perTour.flat();
    },
    // Deferred until the caller actually needs it. Parsing every installed
    // tour's content graph is expensive, and firing it the moment the store
    // hydrates froze the JS thread just as the splash lifted.
    enabled: enabled && installed.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnReconnect: false,
  });
}

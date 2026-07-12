import { useQuery } from "@tanstack/react-query";

import { loadInstalledTour } from "@/lib/bundle/load";
import { queryKeys } from "@/lib/query/keys";
import { useInstalledToursStore } from "@/store/installed-tours-store";

export function useInstalledTourContent(tourId: string | undefined) {
  // bundleId is used only as a cache-buster (so a re-download/update refetches);
  // it must NOT gate the query. The on-disk bundle is the source of truth for
  // "installed", so the query runs whenever there is a tourId — even if the
  // in-memory installed-tours store hasn't hydrated yet. This is what keeps a
  // downloaded tour usable fully offline instead of falling back to "not
  // installed / download the tour".
  const bundleId = useInstalledToursStore((state) =>
    tourId ? state.installedByTourId[tourId]?.bundleId : undefined,
  );

  return useQuery({
    queryKey: queryKeys.installedTour.detail(tourId ?? "", bundleId),
    queryFn: () => loadInstalledTour(tourId!),
    enabled: Boolean(tourId),
    // Disk-backed bundle only changes on install/update — keep it warm offline.
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(250, 50 * 2 ** attempt),
    refetchOnMount: true,
    refetchOnReconnect: false,
  });
}

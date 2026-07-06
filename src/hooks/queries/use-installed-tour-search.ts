import { useQuery } from "@tanstack/react-query";

import { loadInstalledTourSearchDocuments } from "@/lib/bundle/load";
import { queryKeys } from "@/lib/query/keys";
import { useInstalledToursStore } from "@/store/installed-tours-store";

export function useInstalledTourSearchDocuments(tourId: string | undefined) {
  const bundleId = useInstalledToursStore((state) =>
    tourId ? state.installedByTourId[tourId]?.bundleId : undefined,
  );

  return useQuery({
    queryKey: queryKeys.installedTour.search(tourId ?? "", bundleId),
    queryFn: () => loadInstalledTourSearchDocuments(tourId!),
    enabled: Boolean(tourId && bundleId),
    staleTime: 0,
  });
}

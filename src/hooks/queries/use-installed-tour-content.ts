import { useQuery } from "@tanstack/react-query";

import { loadInstalledTourContent } from "@/lib/bundle/load";
import { queryKeys } from "@/lib/query/keys";
import { useInstalledToursStore } from "@/store/installed-tours-store";

export function useInstalledTourContent(tourId: string | undefined) {
  const bundleId = useInstalledToursStore((state) =>
    tourId ? state.installedByTourId[tourId]?.bundleId : undefined,
  );

  return useQuery({
    queryKey: queryKeys.installedTour.detail(tourId ?? "", bundleId),
    queryFn: () => loadInstalledTourContent(tourId!),
    enabled: Boolean(tourId && bundleId),
    staleTime: 0,
  });
}

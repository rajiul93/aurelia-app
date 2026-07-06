import { useQuery } from "@tanstack/react-query";

import { loadMediaCacheMap } from "@/lib/bundle/media-cache";
import { queryKeys } from "@/lib/query/keys";
import { useInstalledToursStore } from "@/store/installed-tours-store";

export function useInstalledMediaMap(tourId: string | undefined) {
  const bundleId = useInstalledToursStore((state) =>
    tourId ? state.installedByTourId[tourId]?.bundleId : undefined,
  );

  return useQuery({
    queryKey: [...queryKeys.installedTour.all, tourId ?? "", "media-map", bundleId ?? "none"],
    queryFn: () => loadMediaCacheMap(tourId!),
    enabled: Boolean(tourId && bundleId),
    staleTime: 0,
  });
}

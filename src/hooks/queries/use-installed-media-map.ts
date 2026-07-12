import { useQuery } from "@tanstack/react-query";

import { loadMediaCacheMap } from "@/lib/bundle/media-cache";
import { normalizeRouteParam } from "@/lib/router/normalize-route-param";
import { queryKeys } from "@/lib/query/keys";

export function useInstalledMediaMap(tourIdParam: string | string[] | undefined) {
  const tourId = normalizeRouteParam(tourIdParam);

  return useQuery({
    queryKey: [...queryKeys.installedTour.detail(tourId ?? ""), "media-map"],
    queryFn: () => loadMediaCacheMap(tourId!),
    enabled: Boolean(tourId),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(500, 100 * 2 ** attempt),
    refetchOnReconnect: false,
  });
}

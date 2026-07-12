import { useQuery } from "@tanstack/react-query";

import { loadInstalledTourSearchDocuments } from "@/lib/bundle/load";
import { normalizeRouteParam } from "@/lib/router/normalize-route-param";
import { queryKeys } from "@/lib/query/keys";

export function useInstalledTourSearchDocuments(
  tourIdParam: string | string[] | undefined,
) {
  const tourId = normalizeRouteParam(tourIdParam);

  return useQuery({
    queryKey: queryKeys.installedTour.search(tourId ?? ""),
    queryFn: () => loadInstalledTourSearchDocuments(tourId!),
    enabled: Boolean(tourId),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 3,
    refetchOnReconnect: false,
  });
}

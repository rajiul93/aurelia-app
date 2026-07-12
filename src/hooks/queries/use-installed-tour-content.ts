import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";

import { loadInstalledTour } from "@/lib/bundle/load";
import { normalizeRouteParam } from "@/lib/router/normalize-route-param";
import { queryKeys } from "@/lib/query/keys";

export function useInstalledTourContent(tourIdParam: string | string[] | undefined) {
  const tourId = normalizeRouteParam(tourIdParam);

  return useQuery({
    queryKey: queryKeys.installedTour.detail(tourId ?? ""),
    queryFn: async () => {
      const bundle = await loadInstalledTour(tourId!);
      if (!bundle) {
        throw new Error(`Installed tour missing on disk: ${tourId}`);
      }
      return bundle;
    },
    enabled: Boolean(tourId),
    staleTime: (query) =>
      query.state.data ? Number.POSITIVE_INFINITY : 0,
    gcTime: 24 * 60 * 60 * 1000,
    // Disk reads are cheap and a false "not installed" is expensive, so retry
    // regardless of what the in-memory store thinks — on a cold start it may not
    // know about the tour yet.
    retry: (failureCount) => failureCount < 8,
    retryDelay: (attempt) => Math.min(2_000, 100 * 2 ** attempt),
    refetchOnMount: (query) => !query.state.data,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

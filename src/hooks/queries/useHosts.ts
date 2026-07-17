import { useQuery } from "@tanstack/react-query";
import { hostsService } from "@/services/hosts.service";

const HOSTS_QUERY_KEY = (tourId: string) => ["hosts", tourId];

/**
 * No refetch interval: the list itself (who the hosts are, their hours) changes
 * only when an admin edits it. The one value that used to justify a 30s poll —
 * "are they on duty right now" — is now derived on device from the venue clock
 * by useHostAvailability, so polling burnt battery and data to learn nothing.
 */
export function useHosts(tourId: string) {
  return useQuery({
    queryKey: HOSTS_QUERY_KEY(tourId),
    queryFn: () => hostsService.listByTour(tourId),
    staleTime: 5 * 60_000,
  });
}

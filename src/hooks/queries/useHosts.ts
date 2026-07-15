import { useQuery } from "@tanstack/react-query";
import { hostsService } from "@/services/hosts.service";

const HOSTS_QUERY_KEY = (tourId: string) => ["hosts", tourId];
const REFETCH_INTERVAL = 30_000; // 30 seconds

export function useHosts(tourId: string) {
  return useQuery({
    queryKey: HOSTS_QUERY_KEY(tourId),
    queryFn: () => hostsService.listByTour(tourId),
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 10_000,
  });
}

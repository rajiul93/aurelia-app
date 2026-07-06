import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { getAppStorageSummary } from "@/lib/storage/tour-storage";

export function useStorageSummary() {
  return useQuery({
    queryKey: queryKeys.storage.summary,
    queryFn: getAppStorageSummary,
    staleTime: 0,
  });
}

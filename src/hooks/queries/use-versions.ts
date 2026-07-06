import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { versionsService } from "@/services/versions.service";

export function useVersions() {
  return useQuery({
    queryKey: queryKeys.versions.all,
    queryFn: () => versionsService.get(),
    staleTime: 60 * 1000,
  });
}

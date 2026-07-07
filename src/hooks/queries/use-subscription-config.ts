import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { subscriptionsService } from "@/services/subscriptions.service";

export function useSubscriptionConfig() {
  return useQuery({
    queryKey: queryKeys.subscriptions.config,
    queryFn: () => subscriptionsService.getConfig(),
  });
}

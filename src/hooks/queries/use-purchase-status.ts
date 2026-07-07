import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { subscriptionsService } from "@/services/subscriptions.service";

export function usePurchaseStatus(purchaseId: string | null) {
  return useQuery({
    queryKey: queryKeys.subscriptions.purchase(purchaseId ?? "none"),
    queryFn: () => subscriptionsService.getPurchaseStatus(purchaseId!),
    enabled: Boolean(purchaseId),
    refetchInterval: (query) =>
      query.state.data?.data.status === "PENDING" ? 2000 : false,
  });
}

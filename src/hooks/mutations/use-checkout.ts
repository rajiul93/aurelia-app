import { useMutation } from "@tanstack/react-query";

import { subscriptionsService } from "@/services/subscriptions.service";
import type { CheckoutPayload } from "@/types/subscriptions";

export function useCheckout() {
  return useMutation({
    mutationFn: (payload: CheckoutPayload) =>
      subscriptionsService.checkout(payload),
  });
}

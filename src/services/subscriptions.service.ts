import { apiClient } from "@/lib/axios/client";
import type { ApiSuccess } from "@/types/api";
import type {
  CheckoutPayload,
  CheckoutResult,
  SubscriptionConfig,
  SubscriptionPurchaseStatusResult,
} from "@/types/subscriptions";

export const subscriptionsService = {
  getConfig() {
    return apiClient
      .get<ApiSuccess<SubscriptionConfig>>("/subscriptions/config")
      .then((response) => response.data);
  },

  checkout(payload: CheckoutPayload) {
    return apiClient
      .post<ApiSuccess<CheckoutResult>>("/subscriptions/checkout", payload)
      .then((response) => response.data);
  },

  getPurchaseStatus(purchaseId: string) {
    return apiClient
      .get<ApiSuccess<SubscriptionPurchaseStatusResult>>(
        `/subscriptions/purchases/${purchaseId}`,
      )
      .then((response) => response.data);
  },
};

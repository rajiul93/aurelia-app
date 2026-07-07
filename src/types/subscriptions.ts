export type SubscriptionPlanOption = {
  id: string;
  name: string;
  durationInDays: number;
  basePrice: number;
  isActive: boolean;
  sortOrder: number;
};

export type DevicePricingTierOption = {
  id: string;
  deviceCount: number;
  additionalPrice: number;
  isActive: boolean;
};

export type SubscriptionConfig = {
  plans: SubscriptionPlanOption[];
  deviceTiers: DevicePricingTierOption[];
  currency: string;
  multiDeviceDiscountEnabled: boolean;
  multiDeviceDiscountPercent: number;
  maxDevicesPerPurchase: number;
};

export type CheckoutPayload = {
  planId: string;
  deviceCount: number;
  tourIds: string[];
};

export type CheckoutResult = {
  purchaseId: string;
  clientSecret: string;
  amount: number;
  currency: string;
};

export type SubscriptionPurchaseStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type SubscriptionPurchaseStatusResult = {
  id: string;
  status: SubscriptionPurchaseStatus;
  totalAmount: number;
  currency: string;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export type SubscriptionPriceBreakdown = {
  basePrice: number;
  deviceSurcharge: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
};

type ComputeSubscriptionPriceInput = {
  basePrice: number;
  deviceCount: number;
  multiDeviceDiscountEnabled: boolean;
  multiDeviceDiscountPercent: number;
};

/**
 * Mirrors the server-side computePrice logic for subscribe-screen previews.
 */
export function computeSubscriptionPrice(
  input: ComputeSubscriptionPriceInput,
): SubscriptionPriceBreakdown {
  if (input.deviceCount <= 1) {
    return {
      basePrice: round2(input.basePrice),
      deviceSurcharge: 0,
      discountPercent: 0,
      discountAmount: 0,
      total: round2(input.basePrice),
    };
  }

  const discountPercent = input.multiDeviceDiscountEnabled
    ? input.multiDeviceDiscountPercent
    : 0;
  const subtotal = round2(input.basePrice * input.deviceCount);
  const deviceSurcharge = round2(input.basePrice * (input.deviceCount - 1));
  const discountAmount = round2((subtotal * discountPercent) / 100);

  return {
    basePrice: round2(input.basePrice),
    deviceSurcharge,
    discountPercent,
    discountAmount,
    total: round2(subtotal - discountAmount),
  };
}

import { describe, expect, it } from "vitest";

import { computeSubscriptionPrice } from "@/lib/subscription-pricing";

describe("computeSubscriptionPrice", () => {
  const base = {
    basePrice: 5,
    multiDeviceDiscountEnabled: true,
    multiDeviceDiscountPercent: 10,
  };

  it("charges base price for a single device", () => {
    expect(
      computeSubscriptionPrice({
        ...base,
        deviceCount: 1,
      }),
    ).toEqual({
      basePrice: 5,
      deviceSurcharge: 0,
      discountPercent: 0,
      discountAmount: 0,
      total: 5,
    });
  });

  it("subtracts the multi-device discount from the subtotal", () => {
    expect(
      computeSubscriptionPrice({
        ...base,
        deviceCount: 2,
      }),
    ).toEqual({
      basePrice: 5,
      deviceSurcharge: 5,
      discountPercent: 10,
      discountAmount: 1,
      total: 9,
    });

    expect(
      computeSubscriptionPrice({
        ...base,
        deviceCount: 3,
      }),
    ).toEqual({
      basePrice: 5,
      deviceSurcharge: 10,
      discountPercent: 10,
      discountAmount: 1.5,
      total: 13.5,
    });
  });
});

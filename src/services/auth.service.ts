import { Platform } from "react-native";

import { apiClient } from "@/lib/axios/client";
import { getOrCreateDeviceId } from "@/lib/device-id";
import type { ApiSuccess } from "@/types/api";
import type {
  Entitlements,
  OtpRequestResult,
  OtpVerifyResult,
  UnlockResult,
} from "@/types/auth";

export const authService = {
  /**
   * Unlock with the phone number and 4-digit PIN the seller sent by hand. This
   * registers the device against the buyer's grant; the returned session token
   * is what every later request uses, so the PIN is not asked for again.
   */
  async unlock(phone: string, pin: string) {
    const deviceId = await getOrCreateDeviceId();

    return apiClient
      .post<ApiSuccess<UnlockResult>>("/auth/unlock", {
        phone,
        pin,
        deviceId,
        deviceName: `${Platform.OS} device`,
        platform: Platform.OS === "ios" ? "ios" : "android",
      })
      .then((response) => response.data);
  },

  // Email OTP sign-in is gone from the app: buyers are identified by phone now
  // and we never hold their email. The server still exposes /auth/otp/* for
  // grants that carry an email from a self-service Stripe purchase.

  getEntitlements() {
    return apiClient
      .get<ApiSuccess<Entitlements>>("/me/entitlements")
      .then((response) => response.data);
  },

  // No self-revoke: only the seller can free a device slot, or one grant could
  // be passed around indefinitely by swapping devices.
};

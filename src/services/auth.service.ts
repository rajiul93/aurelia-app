import { Platform } from "react-native";

import { apiClient } from "@/lib/axios/client";
import { getOrCreateDeviceId } from "@/lib/device-id";
import type { ApiSuccess } from "@/types/api";
import type {
  Entitlements,
  OtpRequestResult,
  OtpVerifyResult,
} from "@/types/auth";

export const authService = {
  requestOtp(email: string) {
    return apiClient
      .post<ApiSuccess<OtpRequestResult>>("/auth/otp/request", { email })
      .then((response) => response.data);
  },

  async verifyOtp(email: string, code: string) {
    const deviceId = await getOrCreateDeviceId();

    return apiClient
      .post<ApiSuccess<OtpVerifyResult>>("/auth/otp/verify", {
        email,
        code,
        deviceId,
        deviceName: `${Platform.OS} device`,
        platform: Platform.OS === "ios" ? "ios" : "android",
      })
      .then((response) => response.data);
  },

  getEntitlements() {
    return apiClient
      .get<ApiSuccess<Entitlements>>("/me/entitlements")
      .then((response) => response.data);
  },

  revokeDevice() {
    return apiClient
      .post<ApiSuccess<{ revoked: boolean; deviceId: string }>>(
        "/auth/device/revoke",
      )
      .then((response) => response.data);
  },
};

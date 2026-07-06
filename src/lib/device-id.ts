import { Platform } from "react-native";

import {
  getSecureItem,
  setSecureItem,
} from "@/lib/secure-storage";

const DEVICE_ID_KEY = "aurelia.deviceId";

function createDeviceId() {
  return `aurelia-${Platform.OS}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export async function getOrCreateDeviceId() {
  const existing = await getSecureItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = createDeviceId();
  await setSecureItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

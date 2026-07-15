export type OtpRequestResult = {
  sent: boolean;
  expiresInSeconds: number;
  devCode?: string;
  devHint?: string;
};

/**
 * What a successful phone + PIN unlock returns. The session token is stored in
 * SecureStore, so the PIN is never needed again on this device.
 */
export type UnlockResult = {
  sessionToken: string;
  sessionId: string;
  deviceId: string;
  phone: string;
  activatedAt: string;
  expiresAt: string;
  maxDevices: number;
  activeDeviceCount: number;
  tours: Array<{ id: string; slug: string }>;
};

export type OtpVerifyResult = {
  sessionToken: string;
  sessionId: string;
  deviceId: string;
  email: string | null;
  expiresAt: string;
  maxDevices: number;
  activeDeviceCount: number;
  tours: Array<{ id: string; slug: string }>;
};

/**
 * The last entitlements response persisted to disk. It is the offline source of
 * truth for "does this device still have access?" — the app trusts it until
 * `entitlements.expiresAt` passes, so opening a downloaded tour needs no network.
 */
export type EntitlementsSnapshot = {
  entitlements: Entitlements;
  fetchedAt: string;
};

export type Entitlements = {
  phone: string;
  email: string | null;
  status: string;
  activatedAt: string;
  expiresAt: string;
  maxDevices: number;
  activeDeviceCount: number;
  seatsRemaining: number;
  allowSubscriptionFeatures: boolean;
  tours: Array<{
    id: string;
    slug: string;
    title: string;
    tourBundleVersion: number;
    mediaVersion: number;
    aiKnowledgeVersion: number;
    routeVersion: number;
  }>;
};

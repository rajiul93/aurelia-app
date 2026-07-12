export type OtpRequestResult = {
  sent: boolean;
  expiresInSeconds: number;
  devCode?: string;
  devHint?: string;
};

export type OtpVerifyResult = {
  sessionToken: string;
  sessionId: string;
  deviceId: string;
  email: string;
  expiresAt: string;
  ticketCount: number;
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
  email: string;
  status: string;
  expiresAt: string;
  ticketCount: number;
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

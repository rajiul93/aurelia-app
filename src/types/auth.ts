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

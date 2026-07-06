export type RemoteConfig = {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  enableOfflineChat: boolean;
  enableGpsNavigation: boolean;
  enableVoiceGuidance: boolean;
  maxDownloadSizeMb: number;
  maxChatHistory: number;
  supportedLanguages: string[];
  emergencyAnnouncement: string | null;
};

export type ReleaseConfig = {
  appContentVersion: number;
  apiVersion: number;
  schemaVersion: number;
  remoteConfigVersion: number;
  publishStatus: string;
  publishedAt: string | null;
  remote: RemoteConfig;
  syncedAt: string;
};

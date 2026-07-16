import type { RemoteConfig, ReleaseConfig } from "@/types/release-config";

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  maintenanceMode: false,
  maintenanceMessage: null,
  enableOfflineChat: true,
  enableGpsNavigation: false,
  enableVoiceGuidance: true,
  maxDownloadSizeMb: 500,
  maxChatHistory: 50,
  supportedLanguages: ["en", "es", "fr"],
  emergencyAnnouncement: null,
  reminderOffsetDays: [3, 2, 1],
  reminderHour: 9,
  reminderNudgeEnabled: true,
};

export const DEFAULT_RELEASE_CONFIG: ReleaseConfig = {
  appContentVersion: 1,
  apiVersion: 1,
  schemaVersion: 1,
  remoteConfigVersion: 1,
  publishStatus: "DRAFT",
  publishedAt: null,
  remote: DEFAULT_REMOTE_CONFIG,
  syncedAt: "",
};

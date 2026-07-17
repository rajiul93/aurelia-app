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
  // Seeds the pre-sync config to match the DB column default; the first sync
  // overwrites it. A data default, like every other value in this object — the
  // venue's real zone always comes from remote config.
  venueTimezone: "Europe/Rome",
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

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
  /** Days before the visit each prep reminder fires (largest-first). Empty = off. */
  reminderOffsetDays: number[];
  /** Local hour (0–23) prep reminders and the daily nudge fire at. */
  reminderHour: number;
  /** Whether the undated daily "set a date" nudge runs. */
  reminderNudgeEnabled: boolean;
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

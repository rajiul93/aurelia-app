/** Admin-controlled appearance. The app has no user-facing theme switch. */
export type AppTheme = "system" | "light" | "dark";

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
  /**
   * The venue's IANA timezone. Host opening hours and the time-of-day
   * background are read against the venue's clock, not the device's — a
   * visitor's phone carries whatever zone they flew in with.
   */
  venueTimezone: string;
  /**
   * Light/dark appearance, set by the admin — appearance is a venue-wide
   * branding decision, so there is no per-user switch. "system" defers to the
   * device. Cached with the rest of the config, so it survives offline.
   */
  appTheme: AppTheme;
  /**
   * Which AI provider generates chat answers: "gemma" (on-device GGUF) or
   * "gemini" (cloud API). Defaults to "gemma" for backward compatibility.
   */
  aiChatProvider: "gemma" | "gemini";
  /**
   * Master switch for on-device generative answers. Off means the assistant
   * uses keyword retrieval only — the behaviour that shipped before the model.
   * Remote so a bad model build can be turned off for everyone without an app
   * release.
   */
  enableOnDeviceLlm: boolean;
  /** Where to fetch the GGUF from. Null disables downloading entirely. */
  llmModelUrl: string | null;
  /** Exact byte size, checked after download and used for the free-space test. */
  llmModelSizeBytes: number;
  /** Native MD5 of the finished file. Null skips the digest check. */
  llmModelMd5: string | null;
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

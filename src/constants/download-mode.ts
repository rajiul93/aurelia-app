export const DOWNLOAD_MODES = ["FULL", "QUICK"] as const;

export type DownloadMode = (typeof DOWNLOAD_MODES)[number];

export const DEFAULT_DOWNLOAD_MODE: DownloadMode = "FULL";

export function isDownloadMode(value: string): value is DownloadMode {
  return (DOWNLOAD_MODES as readonly string[]).includes(value);
}

import type { StringKey } from "@/i18n/strings";
import type { DownloadProgress } from "@/lib/bundle/download-progress";
import { getDownloadPercent } from "@/lib/bundle/download-progress";

type TranslateFn = (key: StringKey, params?: Record<string, string | number>) => string;

export function getDownloadProgressLabel(
  t: TranslateFn,
  progress: DownloadProgress,
) {
  if (progress.phase === "fetch") {
    return t("download.progressFetch");
  }

  if (progress.phase === "bundle") {
    return t("download.progressBundle");
  }

  if (progress.phase === "map") {
    return t("download.progressMap");
  }

  if (progress.total > 0) {
    return t("download.progressMedia", {
      completed: progress.completed,
      total: progress.total,
    });
  }

  return t("download.progressMediaUnknown");
}

export function formatDownloadPercent(progress: DownloadProgress) {
  return getDownloadPercent(progress);
}

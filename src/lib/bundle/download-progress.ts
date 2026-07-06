export type DownloadProgressPhase = "fetch" | "bundle" | "map" | "media";

export type DownloadProgress = {
  phase: DownloadProgressPhase;
  completed: number;
  total: number;
};

export function getDownloadPercent(progress: DownloadProgress) {
  const { phase, completed, total } = progress;

  if (phase === "fetch") {
    if (total <= 0) {
      return 0;
    }

    return Math.round((completed / total) * 8);
  }

  if (phase === "bundle") {
    const safeTotal = Math.max(total, 1);
    return 8 + Math.round((completed / safeTotal) * 7);
  }

  if (phase === "map") {
    const safeTotal = Math.max(total, 1);
    return 15 + Math.round((completed / safeTotal) * 10);
  }

  if (total <= 0) {
    return 100;
  }

  return 25 + Math.round((completed / total) * 75);
}

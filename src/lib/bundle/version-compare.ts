import type { InstalledTourMeta } from "@/types/tour-bundle";

export type EntitledVersions = {
  tourBundleVersion: number;
  mediaVersion: number;
  aiKnowledgeVersion: number;
  routeVersion: number;
};

export type InstalledVersions = EntitledVersions;

/**
 * On-disk install layout this build writes and can read.
 * 1 (or a missing field) = media encrypted at rest. 2 = plaintext media.
 */
export const CURRENT_INSTALL_FORMAT_VERSION = 2;

/**
 * True when an install predates the current on-disk layout. Such a tour still
 * opens — its media just falls back to remote urls — but it needs re-downloading
 * to work offline again.
 */
export function isInstallFormatStale(installed: {
  installFormatVersion?: number;
}) {
  return (installed.installFormatVersion ?? 0) < CURRENT_INSTALL_FORMAT_VERSION;
}

export function isUpdateAvailable(
  installed: InstalledVersions,
  entitled: EntitledVersions,
) {
  return (
    entitled.tourBundleVersion > installed.tourBundleVersion ||
    entitled.mediaVersion > installed.mediaVersion ||
    entitled.aiKnowledgeVersion > installed.aiKnowledgeVersion ||
    entitled.routeVersion > installed.routeVersion
  );
}

/** Filter installed tours to those due for an update. */
export function getToursNeedingUpdate(
  installedByTourId: Record<string, InstalledTourMeta>,
  entitledVersionsByTourId: Map<string, EntitledVersions>,
): InstalledTourMeta[] {
  return Object.values(installedByTourId).filter((installed) => {
    if (isInstallFormatStale(installed)) {
      return true;
    }

    const entitled = entitledVersionsByTourId.get(installed.tourId);
    return entitled ? isUpdateAvailable(installed, entitled) : false;
  });
}

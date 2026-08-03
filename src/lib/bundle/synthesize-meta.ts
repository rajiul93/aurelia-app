import type { BundleContent } from "@/types/bundle-content";
import type { InstalledTourMeta } from "@/types/tour-bundle";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

const DEFAULT_PREFERENCES: TourDownloadPreferences = {
  audience: "ADULTS",
  contentLanguage: "en",
  downloadMode: "FULL",
};

export function normalizeInstalledTourMeta(
  partial: Partial<InstalledTourMeta>,
  directoryUri: string,
): InstalledTourMeta | null {
  if (!partial.tourId) {
    return null;
  }

  return {
    tourId: partial.tourId,
    slug: partial.slug ?? partial.tourId,
    title: partial.title ?? partial.slug ?? partial.tourId,
    bundleId: partial.bundleId ?? "",
    tourBundleVersion: partial.tourBundleVersion ?? 0,
    mediaVersion: partial.mediaVersion ?? 0,
    aiKnowledgeVersion: partial.aiKnowledgeVersion ?? 0,
    routeVersion: partial.routeVersion ?? 0,
    installedAt: partial.installedAt ?? "",
    directoryUri: partial.directoryUri ?? directoryUri,
    localMediaFileCount: partial.localMediaFileCount ?? 0,
    localMediaFailedCount: partial.localMediaFailedCount ?? 0,
    mediaCachedAt: partial.mediaCachedAt ?? null,
    totalStops: partial.totalStops ?? 0,
    downloadPreferences: partial.downloadPreferences ?? DEFAULT_PREFERENCES,
    // Absent means the install predates the field — i.e. the encrypted format.
    installFormatVersion: partial.installFormatVersion ?? 0,
    accessExpiresAt: partial.accessExpiresAt ?? null,
  };
}

/**
 * Builds an install record when `content.json` exists but `bundle-meta.json`
 * is missing or unreadable (interrupted install, corrupted meta).
 */
export function synthesizeInstalledTourMeta(
  directoryUri: string,
  content: BundleContent,
  folderName: string,
): InstalledTourMeta {
  const tourId = content.tour.id || folderName;

  return {
    tourId,
    slug: content.tour.slug || tourId,
    title: content.tour.title ?? content.tour.slug ?? tourId,
    bundleId: "",
    tourBundleVersion: content.versions.tourBundleVersion,
    mediaVersion: content.versions.mediaVersion,
    aiKnowledgeVersion: content.versions.aiKnowledgeVersion,
    routeVersion: content.versions.routeVersion,
    installedAt: "",
    directoryUri,
    localMediaFileCount: 0,
    localMediaFailedCount: 0,
    mediaCachedAt: null,
    totalStops: content.tour.spots.length,
    downloadPreferences: DEFAULT_PREFERENCES,
    // Meta was missing entirely, so the media layout on disk is unknown — assume
    // the old format and let the update path re-download it.
    installFormatVersion: 0,
    accessExpiresAt: null,
  };
}

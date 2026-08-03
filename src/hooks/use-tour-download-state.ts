import {
  isInstallFormatStale,
  isUpdateAvailable,
  type EntitledVersions,
} from "@/lib/bundle/version-compare";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import type { InstalledTourMeta } from "@/types/tour-bundle";

export type TourDownloadState = {
  /** The on-disk bundle for this tour, or null when nothing is installed. */
  installed: InstalledTourMeta | null;
  /** Installed, but the grant now entitles a newer bundle than what is on disk. */
  updateAvailable: boolean;
};

/**
 * What a tour's download action should do right now.
 *
 * Shared so the tour card's whole-card tap target and the download button inside
 * it can never disagree about which state the tour is in — they read the same
 * store slice through the same comparison.
 */
export function useTourDownloadState(
  tourId: string,
  entitledVersions?: EntitledVersions,
): TourDownloadState {
  const installed = useInstalledToursStore(
    (state) => state.installedByTourId[tourId] ?? null,
  );

  return {
    installed,
    // A stale on-disk format counts as updatable on its own — the media it
    // points at is unreadable by this build, regardless of content versions.
    updateAvailable: Boolean(
      installed &&
        (isInstallFormatStale(installed) ||
          (entitledVersions && isUpdateAvailable(installed, entitledVersions))),
    ),
  };
}

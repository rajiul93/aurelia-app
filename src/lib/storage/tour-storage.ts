import { Directory, File, Paths } from "expo-file-system";

import { listInstalledTourMeta } from "@/lib/bundle/install";
import { getInstalledTourDirectory } from "@/lib/bundle/tour-directory";
import {
  LOW_STORAGE_WARNING_BYTES,
  MIN_FREE_SPACE_BYTES,
} from "@/lib/storage/constants";
import { formatBytes } from "@/lib/storage/format-bytes";

const APP_ROOT = "aurelia";

export type TourStorageEntry = {
  tourId: string;
  title: string;
  slug: string;
  sizeBytes: number;
  localMediaFileCount: number;
  installedAt: string;
};

export type AppStorageSummary = {
  totalUsedBytes: number;
  toursUsedBytes: number;
  progressUsedBytes: number;
  availableBytes: number;
  isLowStorage: boolean;
  tours: TourStorageEntry[];
};

function getAppRootDirectory() {
  return new Directory(Paths.document, APP_ROOT);
}

function getDirectorySize(directory: Directory): number {
  if (!directory.exists) {
    return 0;
  }

  let total = 0;

  for (const entry of directory.list()) {
    if (entry instanceof Directory) {
      total += getDirectorySize(entry);
      continue;
    }

    if (entry instanceof File) {
      total += entry.size ?? 0;
    }
  }

  return total;
}

export function getAvailableDeviceStorageBytes() {
  return Paths.availableDiskSpace ?? 0;
}

export function hasEnoughStorageForDownload(requiredBytes = MIN_FREE_SPACE_BYTES) {
  return getAvailableDeviceStorageBytes() >= requiredBytes;
}

export function getStorageShortfallMessage(requiredBytes = MIN_FREE_SPACE_BYTES) {
  const available = getAvailableDeviceStorageBytes();
  const shortfall = Math.max(requiredBytes - available, 0);

  return `Not enough free storage. Need at least ${formatBytes(requiredBytes)} free (${formatBytes(shortfall)} more required).`;
}

export async function getAppStorageSummary(): Promise<AppStorageSummary> {
  const installed = await listInstalledTourMeta();
  const toursRoot = new Directory(getAppRootDirectory(), "tours");
  const progressFile = new File(getAppRootDirectory(), "tour-progress.json");

  const tours = installed.map((meta) => ({
    tourId: meta.tourId,
    title: meta.title,
    slug: meta.slug,
    sizeBytes: getDirectorySize(getInstalledTourDirectory(meta.tourId)),
    localMediaFileCount: meta.localMediaFileCount,
    installedAt: meta.installedAt,
  }));

  const toursUsedBytes = tours.reduce((sum, tour) => sum + tour.sizeBytes, 0);
  const progressUsedBytes = progressFile.exists ? progressFile.size ?? 0 : 0;
  const totalUsedBytes = getDirectorySize(getAppRootDirectory());
  const availableBytes = getAvailableDeviceStorageBytes();

  return {
    totalUsedBytes,
    toursUsedBytes: toursRoot.exists ? getDirectorySize(toursRoot) : toursUsedBytes,
    progressUsedBytes,
    availableBytes,
    isLowStorage: availableBytes < LOW_STORAGE_WARNING_BYTES,
    tours: tours.sort((left, right) =>
      right.installedAt.localeCompare(left.installedAt),
    ),
  };
}

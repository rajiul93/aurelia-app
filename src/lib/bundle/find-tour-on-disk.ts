import { Directory, File } from "expo-file-system";

import { readJsonFile } from "@/lib/bundle/disk-json";
import { getInstalledTourDirectory, getToursRootDirectory } from "@/lib/bundle/tour-directory";
import type { BundleContent } from "@/types/bundle-content";

const CONTENT_FILE = "content.json";

async function readContentFile(directory: Directory) {
  return readJsonFile<BundleContent>(new File(directory, CONTENT_FILE));
}

/**
 * Scans every installed tour folder and returns content whose `tour.id`
 * matches. Handles folder-name / route-param mismatches on cold start.
 */
export async function findTourContentByScanning(
  tourId: string,
): Promise<{ content: BundleContent; directory: Directory } | null> {
  const root = getToursRootDirectory();

  if (!root.exists) {
    return null;
  }

  for (const entry of root.list()) {
    if (!(entry instanceof Directory)) {
      continue;
    }

    const content = await readContentFile(entry);
    if (content?.tour?.id === tourId) {
      return { content, directory: entry };
    }
  }

  return null;
}

export async function loadTourContentFromDisk(tourId: string) {
  const direct = await readContentFile(getInstalledTourDirectory(tourId));
  if (direct) {
    return direct;
  }

  const scanned = await findTourContentByScanning(tourId);
  return scanned?.content ?? null;
}

/** @alias loadTourContentFromDisk */
export const loadInstalledTourContent = loadTourContentFromDisk;

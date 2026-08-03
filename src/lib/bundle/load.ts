import { File } from "expo-file-system";

import {
  buildSearchDocumentsFromContent,
  mergeSearchDocuments,
} from "@/lib/bundle/build-search-documents";
import { readJsonFile } from "@/lib/bundle/disk-json";
import {
  findTourContentByScanning,
  loadInstalledTourContent,
} from "@/lib/bundle/find-tour-on-disk";
import { getInstalledTourDirectory } from "@/lib/bundle/tour-directory";
import {
  normalizeInstalledTourMeta,
  synthesizeInstalledTourMeta,
} from "@/lib/bundle/synthesize-meta";
import type { BundleContent } from "@/types/bundle-content";
import type { InstalledTourMeta, SearchDocument } from "@/types/tour-bundle";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

const META_FILE = "bundle-meta.json";
const CONTENT_FILE = "content.json";

export { loadInstalledTourContent } from "@/lib/bundle/find-tour-on-disk";

/**
 * Reads a single tour's install record (`bundle-meta.json`) straight from disk.
 * Used so the offline tour screens do not depend on the in-memory installed-tours
 * store being hydrated — the on-disk bundle is the source of truth for "installed".
 */
export async function loadInstalledTourMeta(
  tourId: string,
): Promise<InstalledTourMeta | null> {
  const directory = getInstalledTourDirectory(tourId);
  const metaFile = new File(directory, META_FILE);
  const parsed = await readJsonFile<Partial<InstalledTourMeta>>(metaFile);

  if (parsed) {
    return normalizeInstalledTourMeta(parsed, directory.uri);
  }

  const scanned = await findTourContentByScanning(tourId);
  if (scanned) {
    const scannedMeta = await readJsonFile<Partial<InstalledTourMeta>>(
      new File(scanned.directory, META_FILE),
    );
    if (scannedMeta) {
      return normalizeInstalledTourMeta(scannedMeta, scanned.directory.uri);
    }

    return synthesizeInstalledTourMeta(
      scanned.directory.uri,
      scanned.content,
      scanned.directory.name,
    );
  }

  return null;
}

export type InstalledTourBundle = {
  content: import("@/types/bundle-content").BundleContent;
  preferences: TourDownloadPreferences | null;
};

/**
 * Loads a downloaded tour's content **and** its saved download preferences from
 * disk in one pass. Returns `null` only when the bundle genuinely isn't on disk
 * (i.e. truly not installed) — never because an in-memory store hasn't hydrated.
 * This is what makes an installed tour usable fully offline.
 */
export async function loadInstalledTour(
  tourId: string,
): Promise<InstalledTourBundle | null> {
  try {
    const content = await loadInstalledTourContent(tourId);

    if (!content) {
      return null;
    }

    const meta = await loadInstalledTourMeta(tourId);
    return { content, preferences: meta?.downloadPreferences ?? null };
  } catch {
    return null;
  }
}

export async function loadInstalledTourSearchDocuments(tourId: string) {
  // Canonical directory first, scan only as a fallback. This used to call
  // findTourContentByScanning up-front, which JSON.parses *every* installed
  // tour's content.json looking for a match — so building the chat corpus over
  // N tours cost N² full parses on the JS thread, all at once.
  const directDirectory = getInstalledTourDirectory(tourId);
  const directContent = directDirectory.exists
    ? await readJsonFile<BundleContent>(
        new File(directDirectory, CONTENT_FILE),
      )
    : null;

  const scanned = directContent ? null : await findTourContentByScanning(tourId);
  const directory = scanned?.directory ?? directDirectory;
  const content = directContent ?? scanned?.content ?? null;

  const searchFile = new File(directory, "search", "documents.json");

  let documents: SearchDocument[] = [];

  if (searchFile.exists) {
    const parsed = await readJsonFile<{ documents?: SearchDocument[] }>(
      searchFile,
    );
    documents = parsed?.documents ?? [];
  }

  if (content) {
    documents = mergeSearchDocuments(
      documents,
      buildSearchDocumentsFromContent(content),
    );
  }

  return documents;
}

export async function isTourInstalledOnDisk(tourId: string) {
  const content = await loadInstalledTourContent(tourId);
  return content !== null;
}

import { File } from "expo-file-system";

import {
  buildSearchDocumentsFromContent,
  mergeSearchDocuments,
} from "@/lib/bundle/build-search-documents";
import { getInstalledTourDirectory } from "@/lib/bundle/tour-directory";
import type { BundleContent } from "@/types/bundle-content";
import type { InstalledTourMeta, SearchDocument } from "@/types/tour-bundle";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

const META_FILE = "bundle-meta.json";

export async function loadInstalledTourContent(tourId: string) {
  const directory = getInstalledTourDirectory(tourId);
  const contentFile = new File(directory, "content.json");

  if (!contentFile.exists) {
    return null;
  }

  const raw = await contentFile.text();
  return JSON.parse(raw) as BundleContent;
}

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

  if (!metaFile.exists) {
    return null;
  }

  try {
    return JSON.parse(await metaFile.text()) as InstalledTourMeta;
  } catch {
    return null;
  }
}

export type InstalledTourBundle = {
  content: BundleContent;
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
  const content = await loadInstalledTourContent(tourId);

  if (!content) {
    return null;
  }

  const meta = await loadInstalledTourMeta(tourId);
  return { content, preferences: meta?.downloadPreferences ?? null };
}

export async function loadInstalledTourSearchDocuments(tourId: string) {
  const directory = getInstalledTourDirectory(tourId);
  const searchFile = new File(directory, "search", "documents.json");

  let documents: SearchDocument[] = [];

  if (searchFile.exists) {
    const raw = await searchFile.text();
    const parsed = JSON.parse(raw) as { documents?: SearchDocument[] };
    documents = parsed.documents ?? [];
  }

  const content = await loadInstalledTourContent(tourId);
  if (content) {
    documents = mergeSearchDocuments(
      documents,
      buildSearchDocumentsFromContent(content),
    );
  }

  return documents;
}

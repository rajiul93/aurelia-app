import { File } from "expo-file-system";

import {
  buildSearchDocumentsFromContent,
  mergeSearchDocuments,
} from "@/lib/bundle/build-search-documents";
import { getInstalledTourDirectory } from "@/lib/bundle/tour-directory";
import type { BundleContent } from "@/types/bundle-content";
import type { SearchDocument } from "@/types/tour-bundle";

export async function loadInstalledTourContent(tourId: string) {
  const directory = getInstalledTourDirectory(tourId);
  const contentFile = new File(directory, "content.json");

  if (!contentFile.exists) {
    return null;
  }

  const raw = await contentFile.text();
  return JSON.parse(raw) as BundleContent;
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

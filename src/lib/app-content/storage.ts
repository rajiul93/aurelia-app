import { Directory, File, Paths } from "expo-file-system";

import type { AppContentBundle } from "@/types/app-content";

const APP_ROOT = "aurelia";
const CONTENT_FILE = "app-content.json";

function contentFile() {
  return new File(Paths.document, APP_ROOT, CONTENT_FILE);
}

function ensureAppRoot() {
  const directory = new Directory(Paths.document, APP_ROOT);

  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
}

/**
 * The last app-content bundle we fetched, kept on disk so a cold start with no
 * network still knows its UI strings and asset URLs. Plain JSON, no encryption:
 * this is public CMS copy, not user data.
 *
 * The snapshot carries its own `language`, so it can be loaded before the locale
 * store has hydrated and matched up afterwards.
 */
export async function loadCachedAppContent() {
  const file = contentFile();

  if (!file.exists) {
    return null;
  }

  try {
    const parsed = JSON.parse(await file.text()) as AppContentBundle;
    // A file that parses but has no strings is not a usable bundle.
    return parsed.strings ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCachedAppContent(content: AppContentBundle) {
  ensureAppRoot();
  const file = contentFile();

  if (!file.exists) {
    file.create();
  }

  file.write(JSON.stringify(content));
}

export async function clearCachedAppContent() {
  const file = contentFile();

  if (file.exists) {
    file.delete();
  }
}

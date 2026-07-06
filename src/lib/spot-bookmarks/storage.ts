import { Directory, File, Paths } from "expo-file-system";

const APP_ROOT = "aurelia";
const BOOKMARKS_FILE = "spot-bookmarks.json";

export type SpotBookmarksIndex = Record<string, string[]>;

function bookmarksFile() {
  return new File(Paths.document, APP_ROOT, BOOKMARKS_FILE);
}

function ensureAppRoot() {
  const directory = new Directory(Paths.document, APP_ROOT);

  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
}

export async function loadSpotBookmarksIndex() {
  const file = bookmarksFile();

  if (!file.exists) {
    return {} as SpotBookmarksIndex;
  }

  try {
    return JSON.parse(await file.text()) as SpotBookmarksIndex;
  } catch {
    return {} as SpotBookmarksIndex;
  }
}

export async function saveSpotBookmarksIndex(index: SpotBookmarksIndex) {
  ensureAppRoot();
  const file = bookmarksFile();

  if (!file.exists) {
    file.create();
  }

  file.write(JSON.stringify(index));
}

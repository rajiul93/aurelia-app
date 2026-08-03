import { Directory, File, Paths } from "expo-file-system";

import { collectMediaDownloadItems } from "@/lib/bundle/collect-media-urls";
import { getInstalledTourDirectory } from "@/lib/bundle/tour-directory";
import type { BundleContent } from "@/types/bundle-content";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

const MEDIA_MAP_FILE = "media-map.json";
const MEDIA_DIR = "media";

/**
 * Media is stored as plain files. It used to be AES-GCM encrypted at rest, but
 * that protected nothing: the R2 bucket serving it is public and unsigned, and
 * every remote url is listed in plaintext in this very file and in content.json
 * — so anyone with the file access the encryption defended against could simply
 * read the urls and download the media directly. Version 3 marks the plaintext
 * format; anything older is treated as stale and re-downloaded.
 */
export const MEDIA_CACHE_MAP_VERSION = 3;

export type MediaCacheMap = {
  version: typeof MEDIA_CACHE_MAP_VERSION;
  /** Remote url -> relative path inside the installed tour directory. */
  files: Record<string, string>;
  cachedAt: string;
  failedUrls: string[];
};

type CacheProgress = {
  completed: number;
  total: number;
  currentUrl?: string;
};

function extensionFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split("/").pop() ?? "";
    const dotIndex = segment.lastIndexOf(".");

    if (dotIndex > 0) {
      const ext = segment.slice(dotIndex);
      if (ext.length <= 8) {
        return ext;
      }
    }
  } catch {
    // Ignore invalid URLs.
  }

  return "";
}

function sanitizeFileStem(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

function ensureMediaDirectory(directory: Directory) {
  const existing = directory.list().find((entry) => entry.name === MEDIA_DIR);

  if (existing instanceof Directory) {
    return existing;
  }

  return directory.createDirectory(MEDIA_DIR);
}

/**
 * Deletes the decrypted-media cache the encrypted format used to populate.
 * Self-limiting: once the directory is gone this is a no-op, so it can be called
 * on every install without cost.
 */
export function clearLegacyDecryptedMediaCache() {
  const legacy = new Directory(Paths.cache, "aurelia", "decrypted");

  if (legacy.exists) {
    legacy.delete();
  }
}

export async function loadMediaCacheMap(tourId: string) {
  const directory = getInstalledTourDirectory(tourId);
  const mapFile = new File(directory, MEDIA_MAP_FILE);

  if (!mapFile.exists) {
    return null;
  }

  const parsed = JSON.parse(await mapFile.text()) as { version?: number };

  // Older maps point at encrypted files this build can no longer read. Treat
  // them as absent so media resolves to its remote url until the tour is
  // re-downloaded (see isInstallFormatStale).
  if (parsed.version !== MEDIA_CACHE_MAP_VERSION) {
    return null;
  }

  return parsed as MediaCacheMap;
}

export function resolveInstalledMediaUri(
  tourId: string,
  remoteUrl: string | undefined | null,
  map: MediaCacheMap | null | undefined,
) {
  if (!remoteUrl) {
    return remoteUrl ?? undefined;
  }

  const entry = map?.files[remoteUrl];

  if (typeof entry !== "string") {
    return remoteUrl;
  }

  const file = new File(getInstalledTourDirectory(tourId), entry);
  return file.exists ? file.uri : remoteUrl;
}

export async function cacheTourMediaFiles(
  tourId: string,
  directory: Directory,
  content: BundleContent,
  preferences: TourDownloadPreferences,
  onProgress?: (progress: CacheProgress) => void,
) {
  const items = collectMediaDownloadItems(content, preferences);
  const mediaDirectory = ensureMediaDirectory(directory);
  const files: Record<string, string> = {};
  const failedUrls: string[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;

    const extension = extensionFromUrl(item.url);
    const fileName = `${sanitizeFileStem(item.id)}${extension}`;
    const plainPath = `${MEDIA_DIR}/${fileName}`;
    const destination = new File(mediaDirectory, fileName);

    try {
      await File.downloadFileAsync(item.url, destination, { idempotent: true });
      files[item.url] = plainPath;
    } catch {
      failedUrls.push(item.url);
    }

    onProgress?.({
      completed: index + 1,
      total: items.length,
      currentUrl: item.url,
    });
  }

  if (items.length === 0) {
    onProgress?.({
      completed: 0,
      total: 0,
    });
  }

  const map: MediaCacheMap = {
    version: MEDIA_CACHE_MAP_VERSION,
    files,
    cachedAt: new Date().toISOString(),
    failedUrls,
  };

  const mapFile = new File(directory, MEDIA_MAP_FILE);
  mapFile.write(JSON.stringify(map));

  return map;
}

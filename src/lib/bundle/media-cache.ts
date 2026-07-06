import { Directory, File } from "expo-file-system";

import { collectMediaDownloadItems } from "@/lib/bundle/collect-media-urls";
import { getInstalledTourDirectory } from "@/lib/bundle/tour-directory";
import {
  decryptMediaToCacheUri,
  encryptFileInPlace,
} from "@/lib/crypto/encrypted-media";
import type { BundleContent } from "@/types/bundle-content";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

const MEDIA_MAP_FILE = "media-map.json";
const MEDIA_DIR = "media";

export type MediaCacheFileEntry = {
  path: string;
  encrypted: true;
};

export type MediaCacheMap = {
  version: 2;
  files: Record<string, string | MediaCacheFileEntry>;
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

function isEncryptedEntry(
  entry: string | MediaCacheFileEntry | undefined,
): entry is MediaCacheFileEntry {
  return Boolean(entry && typeof entry === "object" && entry.encrypted);
}

export async function loadMediaCacheMap(tourId: string) {
  const directory = getInstalledTourDirectory(tourId);
  const mapFile = new File(directory, MEDIA_MAP_FILE);

  if (!mapFile.exists) {
    return null;
  }

  const parsed = JSON.parse(await mapFile.text()) as MediaCacheMap | {
    version: 1;
    files: Record<string, string>;
    cachedAt: string;
    failedUrls: string[];
  };

  if (parsed.version === 2) {
    return parsed;
  }

  return {
    version: 2 as const,
    files: parsed.files,
    cachedAt: parsed.cachedAt,
    failedUrls: parsed.failedUrls,
  };
}

export async function resolveInstalledMediaUri(
  tourId: string,
  remoteUrl: string | undefined | null,
  map: MediaCacheMap | null | undefined,
) {
  if (!remoteUrl) {
    return remoteUrl ?? undefined;
  }

  const entry = map?.files[remoteUrl];
  if (!entry) {
    return remoteUrl;
  }

  if (typeof entry === "string") {
    const file = new File(getInstalledTourDirectory(tourId), entry);
    return file.exists ? file.uri : remoteUrl;
  }

  if (isEncryptedEntry(entry)) {
    const decryptedUri = await decryptMediaToCacheUri(
      tourId,
      entry.path,
      remoteUrl,
    );
    return decryptedUri ?? remoteUrl;
  }

  return remoteUrl;
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
  const files: Record<string, MediaCacheFileEntry> = {};
  const failedUrls: string[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;

    const extension = extensionFromUrl(item.url);
    const fileName = `${sanitizeFileStem(item.id)}${extension}`;
    const plainPath = `${MEDIA_DIR}/${fileName}`;
    const encryptedPath = `${MEDIA_DIR}/${fileName}.enc`;
    const destination = new File(mediaDirectory, fileName);

    try {
      await File.downloadFileAsync(item.url, destination, { idempotent: true });
      await encryptFileInPlace(tourId, destination, encryptedPath);
      files[item.url] = { path: encryptedPath, encrypted: true };
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
    version: 2,
    files,
    cachedAt: new Date().toISOString(),
    failedUrls,
  };

  const mapFile = new File(directory, MEDIA_MAP_FILE);
  mapFile.write(JSON.stringify(map));

  return map;
}

import { Directory, File } from "expo-file-system";

import type { DownloadProgress } from "@/lib/bundle/download-progress";
import {
  countTourStops
} from "@/lib/bundle/collect-media-urls";
import { readJsonFile, writeJsonFile } from "@/lib/bundle/disk-json";
import { cacheTourMediaFiles } from "@/lib/bundle/media-cache";
import {
  normalizeInstalledTourMeta,
  synthesizeInstalledTourMeta,
} from "@/lib/bundle/synthesize-meta";
import { deleteOfflineMapPack, ensureOfflineMapPack } from "@/lib/map/offline-pack";
import {
  getInstalledTourDirectory,
  getToursRootDirectory,
} from "@/lib/bundle/tour-directory";
import { verifyTourBundle } from "@/lib/bundle/verify";
import type { BundleContent } from "@/types/bundle-content";
import type { InstalledTourMeta, TourBundleDetail } from "@/types/tour-bundle";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

const META_FILE = "bundle-meta.json";
const CONTENT_FILE = "content.json";

function ensureDirectory(directory: Directory) {
  if (directory.exists) {
    return;
  }

  const parent = directory.parentDirectory;
  if (!parent.exists) {
    ensureDirectory(parent);
  }

  directory.create({ idempotent: true });
}

function replaceDirectory(directory: Directory) {
  if (directory.exists) {
    directory.delete();
  }

  ensureDirectory(directory.parentDirectory);
  directory.create();
}

function buildInstallMeta(input: {
  bundle: TourBundleDetail;
  tour: { slug: string; title: string };
  directory: Directory;
  preferences: TourDownloadPreferences;
  content: BundleContent;
  mediaMap?: {
    files: Record<string, unknown>;
    failedUrls: string[];
    cachedAt: string;
  };
}): InstalledTourMeta {
  const mediaMap = input.mediaMap;

  return {
    tourId: input.bundle.tourId,
    slug: input.tour.slug,
    title: input.tour.title,
    bundleId: input.bundle.bundleId,
    tourBundleVersion: input.bundle.tourBundleVersion,
    mediaVersion: input.bundle.mediaVersion,
    aiKnowledgeVersion: input.bundle.aiKnowledgeVersion,
    routeVersion: input.bundle.routeVersion,
    installedAt: new Date().toISOString(),
    directoryUri: input.directory.uri,
    localMediaFileCount: mediaMap ? Object.keys(mediaMap.files).length : 0,
    localMediaFailedCount: mediaMap?.failedUrls.length ?? 0,
    mediaCachedAt: mediaMap?.cachedAt ?? null,
    totalStops: countTourStops(input.content, input.preferences),
    downloadPreferences: input.preferences,
  };
}

async function readMetaFromDirectory(
  directory: Directory,
): Promise<InstalledTourMeta | null> {
  const metaFile = new File(directory, META_FILE);
  const parsed = await readJsonFile<Partial<InstalledTourMeta>>(metaFile);
  return parsed ? normalizeInstalledTourMeta(parsed, directory.uri) : null;
}

async function readMetaFromContentFallback(
  directory: Directory,
): Promise<InstalledTourMeta | null> {
  const contentFile = new File(directory, CONTENT_FILE);
  const content = await readJsonFile<BundleContent>(contentFile);

  if (!content?.tour?.id) {
    return null;
  }

  return synthesizeInstalledTourMeta(
    directory.uri,
    content,
    directory.name,
  );
}

export { getInstalledTourDirectory } from "@/lib/bundle/tour-directory";

export async function listInstalledTourMeta() {
  const root = getToursRootDirectory();

  if (!root.exists) {
    return [] as InstalledTourMeta[];
  }

  const installed: InstalledTourMeta[] = [];
  const seenTourIds = new Set<string>();

  for (const entry of root.list()) {
    if (!(entry instanceof Directory)) {
      continue;
    }

    const meta =
      (await readMetaFromDirectory(entry)) ??
      (await readMetaFromContentFallback(entry));

    if (!meta || seenTourIds.has(meta.tourId)) {
      continue;
    }

    seenTourIds.add(meta.tourId);
    installed.push(meta);
  }

  return installed.sort((left, right) =>
    right.installedAt.localeCompare(left.installedAt),
  );
}

type InstallProgress = DownloadProgress;

export async function installTourBundle(
  bundle: TourBundleDetail,
  tour: { slug: string; title: string },
  options: {
    preferences: TourDownloadPreferences;
    onProgress?: (progress: InstallProgress) => void;
  },
) {
  await verifyTourBundle(bundle);

  const directory = getInstalledTourDirectory(bundle.tourId);
  replaceDirectory(directory);

  options.onProgress?.({ phase: "bundle", completed: 0, total: 1 });

  writeJsonFile(directory, ["manifest.json"], bundle.manifest);
  writeJsonFile(directory, ["content.json"], bundle.content);
  writeJsonFile(directory, ["search", "documents.json"], {
    documents: bundle.searchDocuments,
  });

  options.onProgress?.({ phase: "bundle", completed: 1, total: 1 });

  const content = bundle.content as BundleContent;

  // Persist the install record immediately after the bundle lands so a cold
  // restart during map/media caching still finds the tour on disk offline.
  writeJsonFile(
    directory,
    [META_FILE],
    buildInstallMeta({
      bundle,
      tour,
      directory,
      preferences: options.preferences,
      content,
    }),
  );

  // Always build the offline map pack so every downloaded tour works offline,
  // independent of the enableGpsNavigation remote flag. ensureOfflineMapPack is
  // non-fatal (it records a "failed" status rather than throwing).
  options.onProgress?.({ phase: "map", completed: 0, total: 100 });
  await ensureOfflineMapPack(bundle.tourId, content, (completed, total) => {
    options.onProgress?.({
      phase: "map",
      completed,
      total,
    });
  });

  const mediaMap = await cacheTourMediaFiles(
    bundle.tourId,
    directory,
    content,
    options.preferences,
    (progress) => {
      options.onProgress?.({
        phase: "media",
        completed: progress.completed,
        total: progress.total,
      });
    },
  );

  const meta = buildInstallMeta({
    bundle,
    tour,
    directory,
    preferences: options.preferences,
    content,
    mediaMap,
  });

  writeJsonFile(directory, [META_FILE], meta);

  return meta;
}

export async function removeInstalledTour(tourId: string) {
  await deleteOfflineMapPack(tourId);
  const directory = getInstalledTourDirectory(tourId);

  if (directory.exists) {
    directory.delete();
  }
}

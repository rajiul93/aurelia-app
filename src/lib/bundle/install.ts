import { Directory, File } from "expo-file-system";

import { toCanonicalJson } from "@/lib/bundle/canonical-json";
import type { DownloadProgress } from "@/lib/bundle/download-progress";
import {
  countTourStops
} from "@/lib/bundle/collect-media-urls";
import { cacheTourMediaFiles } from "@/lib/bundle/media-cache";
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

function writeJsonFile(
  directory: Directory,
  pathParts: string[],
  value: unknown,
) {
  const fileName = pathParts[pathParts.length - 1]!;
  let targetDir = directory;

  for (const segment of pathParts.slice(0, -1)) {
    if (targetDir.list().some((entry) => entry.name === segment)) {
      targetDir = new Directory(targetDir, segment);
    } else {
      targetDir = targetDir.createDirectory(segment);
    }
  }

  const file = targetDir.createFile(fileName, "application/json");
  file.write(toCanonicalJson(value));
}

export { getInstalledTourDirectory } from "@/lib/bundle/tour-directory";

export async function listInstalledTourMeta() {
  const root = getToursRootDirectory();

  if (!root.exists) {
    return [] as InstalledTourMeta[];
  }

  const installed: InstalledTourMeta[] = [];

  for (const entry of root.list()) {
    if (!(entry instanceof Directory)) {
      continue;
    }

    const metaFile = new File(entry, META_FILE);
    if (!metaFile.exists) {
      continue;
    }

    try {
      const meta = JSON.parse(
        await metaFile.text(),
      ) as Partial<InstalledTourMeta>;
      installed.push({
        tourId: meta.tourId!,
        slug: meta.slug!,
        title: meta.title!,
        bundleId: meta.bundleId!,
        tourBundleVersion: meta.tourBundleVersion ?? 0,
        mediaVersion: meta.mediaVersion ?? 0,
        aiKnowledgeVersion: meta.aiKnowledgeVersion ?? 0,
        routeVersion: meta.routeVersion ?? 0,
        installedAt: meta.installedAt ?? "",
        directoryUri: meta.directoryUri ?? entry.uri,
        localMediaFileCount: meta.localMediaFileCount ?? 0,
        localMediaFailedCount: meta.localMediaFailedCount ?? 0,
        mediaCachedAt: meta.mediaCachedAt ?? null,
        totalStops: meta.totalStops ?? 0,
        downloadPreferences: meta.downloadPreferences ?? {
          audience: "ADULTS",
          contentLanguage: "en",
          downloadMode: "FULL",
        },
      });
    } catch {
      // Ignore corrupted install records.
    }
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

  const meta: InstalledTourMeta = {
    tourId: bundle.tourId,
    slug: tour.slug,
    title: tour.title,
    bundleId: bundle.bundleId,
    tourBundleVersion: bundle.tourBundleVersion,
    mediaVersion: bundle.mediaVersion,
    aiKnowledgeVersion: bundle.aiKnowledgeVersion,
    routeVersion: bundle.routeVersion,
    installedAt: new Date().toISOString(),
    directoryUri: directory.uri,
    localMediaFileCount: Object.keys(mediaMap.files).length,
    localMediaFailedCount: mediaMap.failedUrls.length,
    mediaCachedAt: mediaMap.cachedAt,
    totalStops: countTourStops(content, options.preferences),
    downloadPreferences: options.preferences,
  };

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

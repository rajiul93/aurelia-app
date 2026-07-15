import type {
  BundleManifest,
  TourBundleDetail,
} from "@/types/tour-bundle";

import { checksumJson } from "@/lib/bundle/checksum";

// Must reproduce exactly the object the server checksummed in
// buildTourBundleArtifacts — same keys, or the canonical JSON differs and every
// download fails verification. `bundleFormatVersion` is part of that body.
function manifestBodyFromManifest(manifest: BundleManifest) {
  return {
    version: manifest.version,
    bundleId: manifest.bundleId,
    tourId: manifest.tourId,
    bundleFormatVersion: manifest.bundleFormatVersion,
    createdAt: manifest.createdAt,
    languages: manifest.languages,
    tourBundleVersion: manifest.tourBundleVersion,
    mediaVersion: manifest.mediaVersion,
    aiKnowledgeVersion: manifest.aiKnowledgeVersion,
    routeVersion: manifest.routeVersion,
    sqliteVersion: manifest.sqliteVersion,
    files: manifest.files,
  };
}

export async function verifyTourBundle(bundle: TourBundleDetail) {
  const manifestBody = manifestBodyFromManifest(bundle.manifest);
  const manifestChecksum = await checksumJson(manifestBody);

  if (manifestChecksum !== bundle.manifest.checksum) {
    throw new Error("Bundle manifest checksum mismatch");
  }

  if (manifestChecksum !== bundle.checksum) {
    throw new Error("Bundle package checksum mismatch");
  }

  const contentEntry = bundle.manifest.files.find(
    (file) => file.path === "content.json",
  );
  const contentChecksum = await checksumJson(bundle.content);

  if (!contentEntry || contentEntry.checksum !== contentChecksum) {
    throw new Error("Bundle content checksum mismatch");
  }

  const searchEntry = bundle.manifest.files.find(
    (file) => file.path === "search/documents.json",
  );
  const searchChecksum = await checksumJson({
    documents: bundle.searchDocuments,
  });

  if (!searchEntry || searchEntry.checksum !== searchChecksum) {
    throw new Error("Bundle search documents checksum mismatch");
  }
}

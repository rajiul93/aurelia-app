import type { TourDownloadPreferences } from "@/types/tour-preferences";

export type BundleManifestFile = {
  path: string;
  checksum: string;
  size: number;
};

export type BundleManifest = {
  version: string;
  bundleId: string;
  tourId: string;
  checksum: string;
  signature: string;
  signatureAlgorithm: string;
  createdAt: string;
  languages: string[];
  tourBundleVersion: number;
  mediaVersion: number;
  aiKnowledgeVersion: number;
  routeVersion: number;
  sqliteVersion: string;
  files: BundleManifestFile[];
};

export type SearchDocument = {
  id: string;
  language: string;
  audience: string;
  type: "tour" | "spot" | "spot_faq" | "ai_knowledge";
  tourId: string;
  spotId: string | null;
  title: string;
  body: string;
  keywords: string;
};

export type TourBundleDetail = {
  id: string;
  tourId: string;
  bundleId: string;
  tourBundleVersion: number;
  mediaVersion: number;
  aiKnowledgeVersion: number;
  routeVersion: number;
  languages: string[];
  manifest: BundleManifest;
  checksum: string;
  signature: string;
  signatureAlgorithm: string;
  fileCount: number;
  createdAt: string;
  content: unknown;
  searchDocuments: SearchDocument[];
};

export type InstalledTourMeta = {
  tourId: string;
  slug: string;
  title: string;
  bundleId: string;
  tourBundleVersion: number;
  mediaVersion: number;
  aiKnowledgeVersion: number;
  routeVersion: number;
  installedAt: string;
  directoryUri: string;
  localMediaFileCount: number;
  localMediaFailedCount: number;
  mediaCachedAt: string | null;
  totalStops: number;
  downloadPreferences: TourDownloadPreferences;
  /**
   * Access window this bundle was downloaded under, copied from the entitlements
   * snapshot at install time. Each bundle carries its own expiry so it can be
   * locked and swept offline, without depending on any in-memory state. `null`
   * means "no known expiry" — never expires.
   */
  accessExpiresAt: string | null;
};

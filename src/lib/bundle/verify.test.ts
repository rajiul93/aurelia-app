import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { toCanonicalJson } from "@/lib/bundle/canonical-json";
import type { BundleManifest, TourBundleDetail } from "@/types/tour-bundle";

// The device hashes with expo-crypto (SHA256 hex); node crypto gives the same
// bytes, so verify's checksumJson runs unchanged in the test.
vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: async (_algorithm: string, data: string) =>
    createHash("sha256").update(data).digest("hex"),
}));

const { verifyTourBundle } = await import("@/lib/bundle/verify");

const sha256 = (value: unknown) =>
  createHash("sha256").update(toCanonicalJson(value)).digest("hex");

/**
 * Builds a bundle exactly the way the server does: file checksums over each
 * payload, then a package checksum over the manifest body — which includes
 * `bundleFormatVersion`. `formatVersionInBody` lets a test checksum a body that
 * omits it, reproducing the pre-fix server contract that broke every download.
 */
function buildBundle(options?: {
  formatVersionInBody?: boolean;
}): TourBundleDetail {
  const includeFormat = options?.formatVersionInBody ?? true;
  const content = { tour: { id: "tour-1", spots: [] }, versions: {} };
  const searchDocuments = [
    {
      id: "spot:1",
      language: "en",
      audience: "ADULTS",
      type: "spot",
      tourId: "tour-1",
      spotId: "1",
      title: "Arch",
      body: "",
      keywords: "",
    },
  ];

  const files = [
    { path: "content.json", checksum: sha256(content), size: 10 },
    {
      path: "search/documents.json",
      checksum: sha256({ documents: searchDocuments }),
      size: 20,
    },
  ];

  const manifestBody = {
    version: "1",
    bundleId: "bundle-1",
    tourId: "tour-1",
    ...(includeFormat ? { bundleFormatVersion: "2" } : {}),
    createdAt: "2026-07-15T00:00:00.000Z",
    languages: ["en", "es", "fr"],
    tourBundleVersion: 1,
    mediaVersion: 1,
    aiKnowledgeVersion: 1,
    routeVersion: 1,
    sqliteVersion: "1",
    files,
  };

  const checksum = sha256(manifestBody);

  const manifest: BundleManifest = {
    version: "1",
    bundleId: "bundle-1",
    tourId: "tour-1",
    bundleFormatVersion: "2",
    checksum,
    signature: "sig",
    signatureAlgorithm: "HMAC-SHA256",
    createdAt: "2026-07-15T00:00:00.000Z",
    languages: ["en", "es", "fr"],
    tourBundleVersion: 1,
    mediaVersion: 1,
    aiKnowledgeVersion: 1,
    routeVersion: 1,
    sqliteVersion: "1",
    files,
  };

  return {
    bundleId: "bundle-1",
    manifest,
    checksum,
    signature: "sig",
    signatureAlgorithm: "HMAC-SHA256",
    fileCount: 3,
    createdAt: "2026-07-15T00:00:00.000Z",
    content,
    searchDocuments,
  } as TourBundleDetail;
}

describe("verifyTourBundle", () => {
  it("accepts a v2 bundle whose checksum covers bundleFormatVersion", async () => {
    await expect(verifyTourBundle(buildBundle())).resolves.toBeUndefined();
  });

  it("rejects when bundleFormatVersion is left out of the checksummed body", async () => {
    // This is the exact regression: the server put bundleFormatVersion in the
    // manifest body, the app rebuilt the body without it, and every download
    // failed with "Bundle manifest checksum mismatch".
    await expect(
      verifyTourBundle(buildBundle({ formatVersionInBody: false })),
    ).rejects.toThrow("Bundle manifest checksum mismatch");
  });

  it("rejects a tampered content payload", async () => {
    const bundle = buildBundle();
    (bundle.content as { tour: { id: string } }).tour.id = "tour-2";
    await expect(verifyTourBundle(bundle)).rejects.toThrow(
      "Bundle content checksum mismatch",
    );
  });
});

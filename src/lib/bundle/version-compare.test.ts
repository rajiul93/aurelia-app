import { describe, expect, it } from "vitest";

import { fallbackTourPreferences } from "@/lib/bundle/content-preferences";
import {
  getToursNeedingUpdate,
  isInstallFormatStale,
  isUpdateAvailable,
} from "@/lib/bundle/version-compare";
import type { InstalledTourMeta } from "@/types/tour-bundle";

function makeInstalled(
  overrides: Partial<InstalledTourMeta> = {},
): InstalledTourMeta {
  return {
    tourId: "tour-1",
    slug: "tour-1",
    title: "Tour One",
    bundleId: "bundle-1",
    tourBundleVersion: 1,
    mediaVersion: 1,
    aiKnowledgeVersion: 1,
    routeVersion: 1,
    installedAt: new Date().toISOString(),
    directoryUri: "file:///tour-1",
    localMediaFileCount: 0,
    localMediaFailedCount: 0,
    mediaCachedAt: null,
    totalStops: 1,
    downloadPreferences: fallbackTourPreferences("en"),
    installFormatVersion: 2,
    accessExpiresAt: null,
    ...overrides,
  };
}

describe("getToursNeedingUpdate", () => {
  it("returns empty array when no tours are installed", () => {
    const result = getToursNeedingUpdate({}, new Map());
    expect(result).toEqual([]);
  });

  it("excludes tours with no entitled entry (not signed in / not entitled)", () => {
    const installed = makeInstalled({ tourId: "tour-1" });
    const entitled = new Map();

    const result = getToursNeedingUpdate(
      { "tour-1": installed },
      entitled,
    );

    expect(result).toEqual([]);
  });

  it("excludes tours where all versions match", () => {
    const installed = makeInstalled({
      tourId: "tour-1",
      tourBundleVersion: 2,
      mediaVersion: 3,
      aiKnowledgeVersion: 5,
      routeVersion: 1,
    });
    const entitled = new Map([
      [
        "tour-1",
        {
          tourBundleVersion: 2,
          mediaVersion: 3,
          aiKnowledgeVersion: 5,
          routeVersion: 1,
        },
      ],
    ]);

    const result = getToursNeedingUpdate(
      { "tour-1": installed },
      entitled,
    );

    expect(result).toEqual([]);
  });

  it("includes tours with a higher tourBundleVersion", () => {
    const installed = makeInstalled({ tourId: "tour-1", tourBundleVersion: 1 });
    const entitled = new Map([
      [
        "tour-1",
        {
          tourBundleVersion: 2,
          mediaVersion: 1,
          aiKnowledgeVersion: 1,
          routeVersion: 1,
        },
      ],
    ]);

    const result = getToursNeedingUpdate(
      { "tour-1": installed },
      entitled,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.tourId).toBe("tour-1");
  });

  it("includes tours with a higher aiKnowledgeVersion (the core use case)", () => {
    const installed = makeInstalled({
      tourId: "tour-1",
      aiKnowledgeVersion: 1,
    });
    const entitled = new Map([
      [
        "tour-1",
        {
          tourBundleVersion: 1,
          mediaVersion: 1,
          aiKnowledgeVersion: 2,
          routeVersion: 1,
        },
      ],
    ]);

    const result = getToursNeedingUpdate(
      { "tour-1": installed },
      entitled,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.tourId).toBe("tour-1");
  });

  it("includes tours with stale installFormatVersion even if content matches", () => {
    const installed = makeInstalled({
      tourId: "tour-1",
      tourBundleVersion: 1,
      mediaVersion: 1,
      aiKnowledgeVersion: 1,
      routeVersion: 1,
      installFormatVersion: 1,
    });
    const entitled = new Map([
      [
        "tour-1",
        {
          tourBundleVersion: 1,
          mediaVersion: 1,
          aiKnowledgeVersion: 1,
          routeVersion: 1,
        },
      ],
    ]);

    const result = getToursNeedingUpdate(
      { "tour-1": installed },
      entitled,
    );

    expect(result).toHaveLength(1);
  });

  it("returns multiple tours in update order", () => {
    const installed1 = makeInstalled({ tourId: "tour-1", aiKnowledgeVersion: 1 });
    const installed2 = makeInstalled({
      tourId: "tour-2",
      mediaVersion: 1,
      installFormatVersion: 1,
    });
    const installed3 = makeInstalled({ tourId: "tour-3", tourBundleVersion: 1 });

    const entitled = new Map([
      [
        "tour-1",
        {
          tourBundleVersion: 1,
          mediaVersion: 1,
          aiKnowledgeVersion: 2,
          routeVersion: 1,
        },
      ],
      [
        "tour-2",
        {
          tourBundleVersion: 1,
          mediaVersion: 2,
          aiKnowledgeVersion: 1,
          routeVersion: 1,
        },
      ],
      [
        "tour-3",
        {
          tourBundleVersion: 1,
          mediaVersion: 1,
          aiKnowledgeVersion: 1,
          routeVersion: 1,
        },
      ],
    ]);

    const result = getToursNeedingUpdate(
      { "tour-1": installed1, "tour-2": installed2, "tour-3": installed3 },
      entitled,
    );

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.tourId)).toEqual(
      expect.arrayContaining(["tour-1", "tour-2"]),
    );
  });
});

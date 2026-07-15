import { describe, expect, it } from "vitest";

import { collectMediaDownloadItems } from "@/lib/bundle/collect-media-urls";
import type { BundleContent } from "@/types/bundle-content";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

const FULL: TourDownloadPreferences = {
  audience: "ADULTS",
  contentLanguage: "en",
  downloadMode: "FULL",
};

function content(): BundleContent {
  return {
    tour: {
      id: "tour-1",
      slug: "colosseum",
      translations: [],
      spots: [],
      coverMedia: { id: "m-tour", url: "https://cdn.example.com/tour.jpg" },
    },
    floors: [
      {
        id: "floor-1",
        floorNo: 1,
        route: null,
        coverUrl: "https://cdn.example.com/floor-1.jpg",
      },
      {
        id: "floor-2",
        floorNo: 2,
        route: null,
        coverUrl: "https://cdn.example.com/floor-2.jpg",
      },
      { id: "floor-3", floorNo: 3, route: null, coverUrl: null },
    ],
    versions: {
      tourBundleVersion: 1,
      mediaVersion: 1,
      aiKnowledgeVersion: 1,
      routeVersion: 1,
    },
  };
}

describe("collectMediaDownloadItems", () => {
  it("collects floor cover images so they cache for offline", () => {
    // The bug: floor covers were never collected, so the home floor cards had
    // nothing to show once offline.
    const urls = collectMediaDownloadItems(content(), FULL).map(
      (item) => item.url,
    );

    expect(urls).toContain("https://cdn.example.com/floor-1.jpg");
    expect(urls).toContain("https://cdn.example.com/floor-2.jpg");
  });

  it("skips a floor with no cover", () => {
    const items = collectMediaDownloadItems(content(), FULL);
    expect(items.some((item) => item.id === "floor-cover-floor-3")).toBe(false);
  });

  it("leaves floor covers out of a QUICK download", () => {
    const urls = collectMediaDownloadItems(content(), {
      ...FULL,
      downloadMode: "QUICK",
    }).map((item) => item.url);

    expect(urls).not.toContain("https://cdn.example.com/floor-1.jpg");
  });
});

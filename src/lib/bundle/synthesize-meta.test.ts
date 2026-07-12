import { describe, expect, it } from "vitest";

import {
  normalizeInstalledTourMeta,
  synthesizeInstalledTourMeta,
} from "@/lib/bundle/synthesize-meta";
import type { BundleContent } from "@/types/bundle-content";

const sampleContent: BundleContent = {
  tour: {
    id: "tour-1",
    slug: "paris-walk",
    title: "Paris Walk",
    translations: [],
    spots: [{ id: "s1" }, { id: "s2" }] as BundleContent["tour"]["spots"],
  },
  route: null,
  versions: {
    tourBundleVersion: 3,
    mediaVersion: 2,
    aiKnowledgeVersion: 1,
    routeVersion: 4,
  },
};

describe("synthesize-meta", () => {
  it("normalizes partial install records from disk", () => {
    expect(
      normalizeInstalledTourMeta(
        {
          tourId: "tour-1",
          slug: "paris-walk",
          title: "Paris Walk",
          bundleId: "bundle-1",
        },
        "file:///tours/tour-1",
      ),
    ).toMatchObject({
      tourId: "tour-1",
      directoryUri: "file:///tours/tour-1",
      downloadPreferences: {
        audience: "ADULTS",
        contentLanguage: "en",
        downloadMode: "FULL",
      },
    });
  });

  it("synthesizes install metadata from content.json alone", () => {
    expect(
      synthesizeInstalledTourMeta(
        "file:///tours/tour-1",
        sampleContent,
        "tour-1",
      ),
    ).toMatchObject({
      tourId: "tour-1",
      slug: "paris-walk",
      title: "Paris Walk",
      totalStops: 2,
      tourBundleVersion: 3,
    });
  });
});

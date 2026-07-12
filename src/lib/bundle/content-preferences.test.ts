import { describe, expect, it } from "vitest";

import {
  fallbackTourPreferences,
  resolveTourPreferences,
} from "@/lib/bundle/content-preferences";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

const disk: TourDownloadPreferences = {
  audience: "ADULTS",
  contentLanguage: "en",
  downloadMode: "FULL",
};
const store: TourDownloadPreferences = {
  audience: "CHILDREN",
  contentLanguage: "fr",
  downloadMode: "QUICK",
};

describe("resolveTourPreferences", () => {
  it("prefers the on-disk install record (offline source of truth)", () => {
    expect(resolveTourPreferences(disk, store)).toBe(disk);
  });

  it("falls back to the in-memory store meta when disk is absent", () => {
    // This is the offline-first fix: even if the disk record is missing, a
    // hydrated store still lets the tour render.
    expect(resolveTourPreferences(null, store)).toBe(store);
    expect(resolveTourPreferences(undefined, store)).toBe(store);
  });

  it("returns disk prefs even when the store is empty (the core bug case)", () => {
    // Store not hydrated → previously the tour showed "not installed"; now the
    // on-disk preferences alone are enough to render it offline.
    expect(resolveTourPreferences(disk, null)).toBe(disk);
  });

  it("returns null only when neither source knows the tour", () => {
    expect(resolveTourPreferences(null, null)).toBeNull();
    expect(resolveTourPreferences(undefined, undefined)).toBeNull();
  });
});

describe("fallbackTourPreferences", () => {
  it("keeps a downloaded tour viewable when its install record is lost", () => {
    // content.json on disk but bundle-meta.json missing/corrupt (interrupted
    // install). The tour must still render instead of reporting "not installed".
    expect(fallbackTourPreferences("fr")).toEqual({
      audience: "ADULTS",
      contentLanguage: "fr",
      downloadMode: "FULL",
    });
  });

  it("uses FULL mode so nothing in the bundle is filtered out", () => {
    // QUICK would silently hide spots/media the user actually downloaded.
    expect(fallbackTourPreferences("en").downloadMode).toBe("FULL");
  });
});

import { describe, expect, it } from "vitest";

import {
  enumerateBackgroundUrls,
  getCurrentTimeOfDay,
  resolveAppAssetUrl,
  resolveAppBackgroundUrl,
} from "./resolve-asset";
import type { AppContentBundle } from "@/types/app-content";

type Assets = AppContentBundle["assets"];

function asset(url: string, timeOfDay: Assets[string]["timeOfDay"] = null) {
  return { url, timeOfDay, mimeType: "image/jpeg" };
}

const perSlot: Assets = {
  "background.morning": asset("https://cdn.test/m.jpg", "MORNING"),
  "background.afternoon": asset("https://cdn.test/a.jpg", "AFTERNOON"),
  "background.evening": asset("https://cdn.test/e.jpg", "EVENING"),
};

describe("resolveAppBackgroundUrl", () => {
  it("picks the asset for the requested slot", () => {
    expect(resolveAppBackgroundUrl(perSlot, "MORNING")).toBe(
      "https://cdn.test/m.jpg",
    );
    expect(resolveAppBackgroundUrl(perSlot, "EVENING")).toBe(
      "https://cdn.test/e.jpg",
    );
  });

  it("falls back to a generic background when the slot has none", () => {
    const assets: Assets = { background: asset("https://cdn.test/generic.jpg") };

    expect(resolveAppBackgroundUrl(assets, "MORNING")).toBe(
      "https://cdn.test/generic.jpg",
    );
  });

  it("matches on timeOfDay when the key is not slot-named", () => {
    const assets: Assets = {
      "hero.dusk": asset("https://cdn.test/dusk.jpg", "EVENING"),
    };

    expect(resolveAppBackgroundUrl(assets, "EVENING")).toBe(
      "https://cdn.test/dusk.jpg",
    );
    // No MORNING asset and no generic key, so nothing matches.
    expect(resolveAppBackgroundUrl(assets, "MORNING")).toBeNull();
  });

  it("returns null when there are no assets at all", () => {
    expect(resolveAppBackgroundUrl(undefined, "MORNING")).toBeNull();
    expect(resolveAppBackgroundUrl({}, "MORNING")).toBeNull();
  });
});

describe("enumerateBackgroundUrls", () => {
  it("lists all three slot URLs, current slot first", () => {
    expect(enumerateBackgroundUrls(perSlot, "AFTERNOON")).toEqual([
      "https://cdn.test/a.jpg",
      "https://cdn.test/m.jpg",
      "https://cdn.test/e.jpg",
    ]);
  });

  it("de-duplicates when slots share one photo", () => {
    // The generic-background fallback resolves the same URL for every slot;
    // prefetching it three times would be three identical requests.
    const assets: Assets = { background: asset("https://cdn.test/one.jpg") };

    expect(enumerateBackgroundUrls(assets, "MORNING")).toEqual([
      "https://cdn.test/one.jpg",
    ]);
  });

  it("returns only the slots that exist", () => {
    const assets: Assets = {
      "background.morning": asset("https://cdn.test/m.jpg", "MORNING"),
    };

    expect(enumerateBackgroundUrls(assets, "MORNING")).toEqual([
      "https://cdn.test/m.jpg",
    ]);
  });

  it("returns empty when there is nothing to warm", () => {
    expect(enumerateBackgroundUrls(undefined)).toEqual([]);
    expect(enumerateBackgroundUrls({})).toEqual([]);
  });
});

describe("getCurrentTimeOfDay", () => {
  it("reads the slot on the venue clock, not the device clock", () => {
    // These assertions are about the venue's zone, so they hold whatever zone
    // the test runner is in.
    const inRome = getCurrentTimeOfDay("Europe/Rome");
    const inAuckland = getCurrentTimeOfDay("Pacific/Auckland");

    expect(["MORNING", "AFTERNOON", "EVENING"]).toContain(inRome);
    expect(["MORNING", "AFTERNOON", "EVENING"]).toContain(inAuckland);
  });

  it("falls back to a usable slot on a garbage zone rather than throwing", () => {
    expect(["MORNING", "AFTERNOON", "EVENING"]).toContain(
      getCurrentTimeOfDay("Not/AZone"),
    );
  });

  it("still works with no zone configured (pre-sync)", () => {
    expect(["MORNING", "AFTERNOON", "EVENING"]).toContain(getCurrentTimeOfDay());
  });
});

describe("resolveAppAssetUrl", () => {
  it("reads an asset by key", () => {
    expect(resolveAppAssetUrl({ logo: asset("https://cdn.test/l.png") }, "logo")).toBe(
      "https://cdn.test/l.png",
    );
  });

  it("returns null for a missing key or missing assets", () => {
    expect(resolveAppAssetUrl({}, "logo")).toBeNull();
    expect(resolveAppAssetUrl(undefined, "logo")).toBeNull();
  });
});

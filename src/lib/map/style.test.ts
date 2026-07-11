import { describe, expect, it } from "vitest";

import {
  getFallbackMapStyleObject,
  getTourMapPackName,
  getTourMapStyle,
  getTourMapStyleObject,
} from "@/lib/map/style";

function sourceUrl(style: ReturnType<typeof getTourMapStyleObject>) {
  const source = style.sources.openfreemap as { url?: string };
  return source.url ?? "";
}

describe("getTourMapStyleObject", () => {
  it("is an inline style object (loaded without a remote style-doc fetch)", () => {
    const style = getTourMapStyleObject();
    expect(style.version).toBe(8);
    expect(Array.isArray(style.layers)).toBe(true);
    expect(style.layers.length).toBeGreaterThan(0);
  });

  it("uses the openfreemap /planet vector source the offline pack caches", () => {
    expect(sourceUrl(getTourMapStyleObject())).toContain("/planet");
  });

  it("stays in sync with the pack style URL (same tile host)", () => {
    // The pack is created from getTourMapStyle() (URL form); both must reference
    // the same tile host or the live map requests tiles the pack never cached.
    expect(getTourMapStyle()).toContain("openfreemap.org");
    expect(sourceUrl(getTourMapStyleObject())).toContain("openfreemap.org");
  });
});

describe("getFallbackMapStyleObject", () => {
  it("is valid and free of glyph/sprite dependencies", () => {
    const fallback = getFallbackMapStyleObject();
    expect(fallback.version).toBe(8);
    expect(fallback.layers.length).toBeGreaterThan(0);
    expect("glyphs" in fallback).toBe(false);
    expect("sprite" in fallback).toBe(false);
  });

  it("still references the same vector source so cached tiles render", () => {
    expect(sourceUrl(getFallbackMapStyleObject())).toContain("/planet");
  });
});

describe("getTourMapPackName", () => {
  it("derives a stable per-tour pack name", () => {
    expect(getTourMapPackName("tour-1")).toBe("aurelia-tour-tour-1");
  });
});

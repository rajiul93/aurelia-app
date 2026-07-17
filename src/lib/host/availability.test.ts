import { describe, it, expect } from "vitest";
import {
  isHostAvailableNow,
  isWithinWindow,
  supportsTimezoneFormatting,
  venueWallClock,
} from "./availability";
import type { Host } from "@/types/host";

const ROME = "Europe/Rome";

function host(overrides: Partial<Host> = {}): Host {
  return {
    id: "h1",
    tourId: "t1",
    name: "Giulia",
    role: null,
    photoMediaId: null,
    photoUrl: null,
    latitude: 41.89,
    longitude: 12.49,
    availableFrom: "09:00",
    availableTo: "17:00",
    isActive: true,
    isAvailableNow: false,
    sortOrder: 0,
    translations: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("isWithinWindow", () => {
  it("handles a normal window, end-exclusive", () => {
    expect(isWithinWindow("09:00", "17:00", "09:00")).toBe(true);
    expect(isWithinWindow("09:00", "17:00", "12:00")).toBe(true);
    expect(isWithinWindow("09:00", "17:00", "16:59")).toBe(true);
    expect(isWithinWindow("09:00", "17:00", "17:00")).toBe(false);
    expect(isWithinWindow("09:00", "17:00", "08:59")).toBe(false);
  });

  it("handles a window that wraps past midnight", () => {
    expect(isWithinWindow("22:00", "02:00", "23:30")).toBe(true);
    expect(isWithinWindow("22:00", "02:00", "01:30")).toBe(true);
    expect(isWithinWindow("22:00", "02:00", "10:00")).toBe(false);
  });
});

describe("venueWallClock", () => {
  it("converts an instant to the venue's clock", () => {
    const instant = new Date("2026-07-17T08:30:00Z");

    expect(venueWallClock(instant, ROME)).toBe("10:30");
    expect(venueWallClock(instant, "America/New_York")).toBe("04:30");
  });

  it("returns null on an invalid zone instead of throwing", () => {
    expect(venueWallClock(new Date(), "Not/AZone")).toBeNull();
  });
});

describe("isHostAvailableNow", () => {
  it("is false when the host is inactive, whatever the clock says", () => {
    expect(
      isHostAvailableNow(
        host({ isActive: false }),
        ROME,
        new Date("2026-07-17T10:00:00Z"), // 12:00 Rome, mid-shift
      ),
    ).toBe(false);
  });

  it("is true when no hours are set", () => {
    expect(
      isHostAvailableNow(
        host({ availableFrom: null, availableTo: null }),
        ROME,
        new Date("2026-07-17T22:00:00Z"),
      ),
    ).toBe(true);
  });

  it("reads the window on the venue clock, not the device clock", () => {
    // 08:30Z is 10:30 in Rome — inside a 09:00–17:00 shift. A device (or
    // server) reading its own clock in UTC would call this offline.
    expect(
      isHostAvailableNow(host(), ROME, new Date("2026-07-17T08:30:00Z")),
    ).toBe(true);
  });

  it("does not trust the server snapshot when it can compute locally", () => {
    // Server said available; the venue clock says the shift ended. Local wins.
    expect(
      isHostAvailableNow(
        host({ isAvailableNow: true }),
        ROME,
        new Date("2026-07-17T20:00:00Z"), // 22:00 Rome
      ),
    ).toBe(false);
  });

  it("falls back to the server value when the zone is unusable", () => {
    // Not the device clock — that is the bug this all exists to avoid.
    expect(
      isHostAvailableNow(
        host({ isAvailableNow: true }),
        "Not/AZone",
        new Date("2026-07-17T20:00:00Z"),
      ),
    ).toBe(true);
    expect(
      isHostAvailableNow(
        host({ isAvailableNow: false }),
        "Not/AZone",
        new Date("2026-07-17T10:00:00Z"),
      ),
    ).toBe(false);
  });
});

describe("supportsTimezoneFormatting", () => {
  it("detects timeZone support in this runtime", () => {
    // Node has full ICU, so this must be true here. On Hermes it may not be,
    // which is why callers fall back to the server value rather than the device
    // clock.
    expect(supportsTimezoneFormatting()).toBe(true);
  });
});

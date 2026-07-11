import * as Location from "expo-location";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveBootstrapLocation,
  toGpsFix,
} from "@/lib/navigation/bootstrap-location";

vi.mock("expo-location", () => ({
  Accuracy: {
    Balanced: 3,
  },
  getLastKnownPositionAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
}));

describe("bootstrap-location", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps expo location objects to gps fixes", () => {
    expect(
      toGpsFix({
        coords: {
          latitude: 48.8566,
          longitude: 2.3522,
          accuracy: 12,
          heading: 90,
          speed: 1.2,
          altitude: null,
          altitudeAccuracy: null,
        },
        timestamp: 1_700_000_000_000,
      }),
    ).toEqual({
      lat: 48.8566,
      lng: 2.3522,
      accuracy: 12,
      heading: 90,
      speed: 1.2,
      timestamp: 1_700_000_000_000,
    });
  });

  it("prefers a recent last-known fix over a live fix", async () => {
    const cached = {
      coords: {
        latitude: 40.7,
        longitude: -74.0,
        accuracy: 40,
        heading: null,
        speed: null,
        altitude: null,
        altitudeAccuracy: null,
      },
      timestamp: 1_700_000_000_000,
    };

    vi.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(cached);

    await expect(resolveBootstrapLocation()).resolves.toBe(cached);
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("falls back to a balanced current fix when cache is empty", async () => {
    const live = {
      coords: {
        latitude: 51.5,
        longitude: -0.12,
        accuracy: 18,
        heading: null,
        speed: null,
        altitude: null,
        altitudeAccuracy: null,
      },
      timestamp: 1_700_000_100_000,
    };

    vi.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(null);
    vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue(live);

    await expect(resolveBootstrapLocation()).resolves.toBe(live);
  });

  it("returns null when neither cache nor live fix is available", async () => {
    vi.mocked(Location.getLastKnownPositionAsync).mockRejectedValue(
      new Error("no cache"),
    );
    vi.mocked(Location.getCurrentPositionAsync).mockRejectedValue(
      new Error("timeout"),
    );

    await expect(resolveBootstrapLocation()).resolves.toBeNull();
  });
});

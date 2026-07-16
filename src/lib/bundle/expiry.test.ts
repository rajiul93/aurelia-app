import { describe, expect, it } from "vitest";

import { findExpiredInstalledTours, isTourAccessExpired } from "@/lib/bundle/expiry";
import type { Entitlements } from "@/types/auth";
import type { InstalledTourMeta } from "@/types/tour-bundle";

const NOW = new Date("2026-07-13T00:00:00.000Z").getTime();
const PAST = "2026-07-01T00:00:00.000Z";
const FUTURE = "2026-12-01T00:00:00.000Z";

function meta(overrides: Partial<InstalledTourMeta> = {}): InstalledTourMeta {
  return {
    tourId: "tour-1",
    slug: "tour-1",
    title: "Tour 1",
    bundleId: "bundle-1",
    tourBundleVersion: 1,
    mediaVersion: 1,
    aiKnowledgeVersion: 1,
    routeVersion: 1,
    installedAt: "2026-07-01T00:00:00.000Z",
    directoryUri: "file:///tours/tour-1",
    localMediaFileCount: 0,
    localMediaFailedCount: 0,
    mediaCachedAt: null,
    totalStops: 3,
    downloadPreferences: {
      audience: "ADULTS",
      contentLanguage: "en",
      downloadMode: "FULL",
    },
    accessExpiresAt: null,
    ...overrides,
  };
}

function entitlements(overrides: Partial<Entitlements> = {}): Entitlements {
  return {
    phone: "+8801712345678",
    email: null,
    status: "ACTIVE",
    activatedAt: "2020-01-01T00:00:00.000Z",
    expiresAt: FUTURE,
    maxDevices: 1,
    activeDeviceCount: 1,
    seatsRemaining: 1,
    allowSubscriptionFeatures: true,
    tours: [
      {
        id: "tour-1",
        slug: "tour-1",
        title: "Tour 1",
        tourBundleVersion: 1,
        mediaVersion: 1,
        aiKnowledgeVersion: 1,
        routeVersion: 1,
        tourDate: null,
        startTime: null,
      },
    ],
    ...overrides,
  };
}

describe("isTourAccessExpired", () => {
  it("treats an unknown expiry as not expired", () => {
    expect(isTourAccessExpired(meta(), null, NOW)).toBe(false);
  });

  it("expires offline from the expiry stamped into the bundle", () => {
    expect(isTourAccessExpired(meta({ accessExpiresAt: PAST }), null, NOW)).toBe(
      true,
    );
    expect(
      isTourAccessExpired(meta({ accessExpiresAt: FUTURE }), null, NOW),
    ).toBe(false);
  });

  it("lets a renewed snapshot extend a bundle stamped with an older expiry", () => {
    expect(
      isTourAccessExpired(
        meta({ accessExpiresAt: PAST }),
        entitlements({ expiresAt: FUTURE }),
        NOW,
      ),
    ).toBe(false);
  });

  it("expires when the snapshot's access window has ended", () => {
    expect(
      isTourAccessExpired(
        meta({ accessExpiresAt: FUTURE }),
        entitlements({ expiresAt: PAST }),
        NOW,
      ),
    ).toBe(true);
  });

  it("expires when access is inactive or the tour is no longer entitled", () => {
    expect(
      isTourAccessExpired(meta(), entitlements({ status: "EXPIRED" }), NOW),
    ).toBe(true);
    expect(
      isTourAccessExpired(meta(), entitlements({ tours: [] }), NOW),
    ).toBe(true);
  });
});

describe("findExpiredInstalledTours", () => {
  it("returns only the tour ids whose access has ended", () => {
    const installed = [
      meta({ tourId: "keep", accessExpiresAt: FUTURE }),
      meta({ tourId: "sweep", accessExpiresAt: PAST }),
      meta({ tourId: "unknown", accessExpiresAt: null }),
    ];

    expect(findExpiredInstalledTours(installed, null, NOW)).toEqual(["sweep"]);
  });
});

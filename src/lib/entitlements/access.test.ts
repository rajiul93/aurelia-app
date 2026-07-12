import { describe, expect, it } from "vitest";

import {
  isAccessActive,
  isAccessExpired,
  isSnapshotUsable,
} from "@/lib/entitlements/access";
import type { Entitlements, EntitlementsSnapshot } from "@/types/auth";

const NOW = new Date("2026-07-13T00:00:00.000Z").getTime();
const PAST = "2026-07-01T00:00:00.000Z";
const FUTURE = "2026-12-01T00:00:00.000Z";

function snapshot(expiresAt: string): EntitlementsSnapshot {
  return {
    entitlements: {
      email: "user@example.com",
      status: "ACTIVE",
      expiresAt,
      ticketCount: 1,
      activeDeviceCount: 1,
      seatsRemaining: 1,
      allowSubscriptionFeatures: true,
      tours: [],
    } satisfies Entitlements,
    fetchedAt: PAST,
  };
}

describe("isAccessExpired", () => {
  it("is false when no expiry is known", () => {
    expect(isAccessExpired(null, NOW)).toBe(false);
    expect(isAccessExpired(undefined, NOW)).toBe(false);
    expect(isAccessExpired("not-a-date", NOW)).toBe(false);
  });

  it("compares the expiry against now", () => {
    expect(isAccessExpired(PAST, NOW)).toBe(true);
    expect(isAccessExpired(FUTURE, NOW)).toBe(false);
  });
});

describe("isAccessActive", () => {
  it("treats unknown entitlements as active", () => {
    expect(isAccessActive(null, NOW)).toBe(true);
  });

  it("requires an ACTIVE status and an unexpired window", () => {
    expect(isAccessActive(snapshot(FUTURE).entitlements, NOW)).toBe(true);
    expect(isAccessActive(snapshot(PAST).entitlements, NOW)).toBe(false);
    expect(
      isAccessActive(
        { ...snapshot(FUTURE).entitlements, status: "EXPIRED" },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("isSnapshotUsable", () => {
  it("is the gate that keeps the entitlements API call from running", () => {
    // Usable snapshot ⇒ no network call on launch / foreground / tour open.
    expect(isSnapshotUsable(snapshot(FUTURE), NOW)).toBe(true);
    // Expired ⇒ the app is allowed to go ask the server again.
    expect(isSnapshotUsable(snapshot(PAST), NOW)).toBe(false);
    expect(isSnapshotUsable(null, NOW)).toBe(false);
  });
});

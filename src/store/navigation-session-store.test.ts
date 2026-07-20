import { beforeEach, describe, expect, it } from "vitest";

import { useNavigationSessionStore } from "@/store/navigation-session-store";
import type { BundleSpot, GeoPoint } from "@/types/bundle-content";
import type { RawGpsFix } from "@/lib/navigation/types";

function spot(id: string, lat: number, lng: number): BundleSpot {
  return {
    id,
    sortOrder: 0,
    latitude: lat,
    longitude: lng,
    floor: 0,
    includedInQuickTour: true,
    translations: [],
    medias: [],
    faqs: [],
  };
}

// A short straight leg near the Colosseum, so distances stay in metres.
const ROUTE: GeoPoint[] = [
  { lat: 41.8902, lng: 12.4922 },
  { lat: 41.8905, lng: 12.4928 },
  { lat: 41.891, lng: 12.4935 },
];

const SPOTS = [
  spot("s1", 41.8902, 12.4922),
  spot("s2", 41.891, 12.4935),
];

function fix(overrides: Partial<RawGpsFix> = {}): RawGpsFix {
  return {
    lat: 41.8903,
    lng: 12.4924,
    accuracy: 8,
    heading: 0,
    speed: 1,
    timestamp: 1_000,
    ...overrides,
  };
}

function start() {
  useNavigationSessionStore.getState().startSession({
    tourId: "t1",
    routeCoordinates: ROUTE,
    orderedSpots: SPOTS,
    completedSpotIds: [],
  });
}

beforeEach(() => {
  useNavigationSessionStore.getState().reset();
});

describe("navigation-session-store", () => {
  it("ignores fixes before a session has started", () => {
    expect(useNavigationSessionStore.getState().ingestFix(fix())).toBeNull();
    expect(
      useNavigationSessionStore.getState().ingestBootstrapFix(fix()),
    ).toBeNull();
  });

  it("applies a bootstrap fix while there is no position yet", () => {
    start();

    const result = useNavigationSessionStore
      .getState()
      .ingestBootstrapFix(fix());

    expect(result).not.toBeNull();
    expect(
      useNavigationSessionStore.getState().snapshot?.displayLocation,
    ).not.toBeNull();
  });

  // The bootstrap fix is resolved in parallel with the watch subscription, so
  // it can land after a real fix. It must be dropped then: the poor-accuracy
  // branch of processBootstrapLocation returns an empty walkTrail and zero
  // progress, so applying it late would erase the walk, not just move the dot.
  it("drops a bootstrap fix that arrives after a real one", () => {
    start();

    useNavigationSessionStore.getState().ingestFix(fix());
    useNavigationSessionStore
      .getState()
      .ingestFix(fix({ lat: 41.8906, lng: 12.4929, timestamp: 3_000 }));

    const before = useNavigationSessionStore.getState().snapshot;
    expect(before?.walkTrail.length).toBeGreaterThan(0);

    const late = useNavigationSessionStore
      .getState()
      .ingestBootstrapFix(fix({ accuracy: 400, timestamp: 500 }));

    expect(late).toBeNull();

    const after = useNavigationSessionStore.getState().snapshot;
    expect(after).toBe(before);
    expect(after?.walkTrail).toEqual(before?.walkTrail);
    expect(after?.displayLocation).toEqual(before?.displayLocation);
  });

  it("accepts a bootstrap fix again after the session restarts", () => {
    start();
    useNavigationSessionStore.getState().ingestFix(fix());
    expect(
      useNavigationSessionStore.getState().ingestBootstrapFix(fix()),
    ).toBeNull();

    // A floor change or an app resume starts a fresh session; the gap before
    // the first watch fix reopens, so bootstrap is useful once more.
    start();

    expect(
      useNavigationSessionStore.getState().ingestBootstrapFix(fix()),
    ).not.toBeNull();
  });
});

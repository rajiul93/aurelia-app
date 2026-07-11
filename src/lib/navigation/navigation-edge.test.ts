import { describe, expect, it } from "vitest";

import {
  buildRouteCoordinates,
  splitRouteAtIndex,
} from "@/lib/navigation/route-geometry";
import {
  createOffRouteTracker,
  distanceToRouteM,
  updateOffRouteTracker,
} from "@/lib/navigation/off-route";
import {
  hasCompleteRouteFootprints,
  hasCompleteSpotCoordinates,
  hasNavigationGeoData,
} from "@/lib/navigation/validate-geo";
import type {
  BundleContent,
  BundleRoute,
  BundleSpot,
} from "@/types/bundle-content";

function spot(overrides: Partial<BundleSpot> & { id: string }): BundleSpot {
  return {
    sortOrder: 0,
    latitude: 41.89,
    longitude: 12.49,
    floor: 0,
    includedInQuickTour: true,
    translations: [],
    medias: [],
    faqs: [],
    ...overrides,
  };
}

function content(
  spots: BundleSpot[],
  route: BundleRoute | null,
): BundleContent {
  return {
    tour: { id: "t1", slug: "demo", translations: [], spots },
    route,
    versions: {
      tourBundleVersion: 1,
      mediaVersion: 1,
      aiKnowledgeVersion: 1,
      routeVersion: 1,
    },
  };
}

describe("buildRouteCoordinates — edge cases", () => {
  it("orders spots by sortOrder when there is no route", () => {
    const coords = buildRouteCoordinates(
      [
        spot({ id: "b", sortOrder: 1, latitude: 41.9, longitude: 12.5 }),
        spot({ id: "a", sortOrder: 0, latitude: 41.89, longitude: 12.49 }),
      ],
      null,
    );

    expect(coords).toEqual([
      { lat: 41.89, lng: 12.49 },
      { lat: 41.9, lng: 12.5 },
    ]);
  });

  it("drops spots with null coordinates when routeless", () => {
    const coords = buildRouteCoordinates(
      [
        spot({ id: "a", sortOrder: 0 }),
        spot({ id: "b", sortOrder: 1, latitude: null, longitude: null }),
      ],
      null,
    );
    expect(coords).toHaveLength(1);
  });

  it("falls back to a straight line when an edge has no footprint", () => {
    const spots = [
      spot({ id: "a", sortOrder: 0, latitude: 41.89, longitude: 12.49 }),
      spot({ id: "b", sortOrder: 1, latitude: 41.9, longitude: 12.5 }),
    ];
    const route: BundleRoute = {
      id: "r1",
      edges: [
        { id: "e1", fromSpotId: "a", toSpotId: "b", sortOrder: 0, footprintGeo: null },
      ],
    };

    expect(buildRouteCoordinates(spots, route)).toEqual([
      { lat: 41.89, lng: 12.49 },
      { lat: 41.9, lng: 12.5 },
    ]);
  });

  it("does not duplicate a shared vertex between consecutive edges", () => {
    const spots = [
      spot({ id: "a", sortOrder: 0, latitude: 41.89, longitude: 12.49 }),
      spot({ id: "b", sortOrder: 1, latitude: 41.9, longitude: 12.5 }),
      spot({ id: "c", sortOrder: 2, latitude: 41.91, longitude: 12.51 }),
    ];
    const route: BundleRoute = {
      id: "r1",
      edges: [
        {
          id: "e1",
          fromSpotId: "a",
          toSpotId: "b",
          sortOrder: 0,
          footprintGeo: [
            { lat: 41.89, lng: 12.49 },
            { lat: 41.9, lng: 12.5 },
          ],
        },
        {
          id: "e2",
          fromSpotId: "b",
          toSpotId: "c",
          sortOrder: 1,
          footprintGeo: [
            { lat: 41.9, lng: 12.5 },
            { lat: 41.91, lng: 12.51 },
          ],
        },
      ],
    };

    // 4 raw points minus 1 shared vertex = 3.
    expect(buildRouteCoordinates(spots, route)).toHaveLength(3);
  });
});

describe("splitRouteAtIndex — edge cases", () => {
  it("returns empty segments for an empty route", () => {
    expect(splitRouteAtIndex([], 0)).toEqual({ completed: [], upcoming: [] });
  });

  it("clamps an out-of-range index", () => {
    const coords = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
    ];
    const split = splitRouteAtIndex(coords, 99);
    expect(split.completed).toHaveLength(2);
    expect(split.upcoming).toHaveLength(1);
  });
});

describe("validate-geo — edge cases", () => {
  it("treats a single-spot tour as having complete footprints", () => {
    expect(hasCompleteRouteFootprints(content([spot({ id: "a" })], null))).toBe(
      true,
    );
  });

  it("flags missing edges as incomplete footprints", () => {
    const spots = [spot({ id: "a" }), spot({ id: "b" }), spot({ id: "c" })];
    const route: BundleRoute = {
      id: "r1",
      edges: [
        {
          id: "e1",
          fromSpotId: "a",
          toSpotId: "b",
          sortOrder: 0,
          footprintGeo: [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 1 },
          ],
        },
      ],
    };
    expect(hasCompleteRouteFootprints(content(spots, route))).toBe(false);
  });

  it("fails coordinate completeness when any spot lacks a coordinate", () => {
    const spots = [
      spot({ id: "a" }),
      spot({ id: "b", latitude: null, longitude: null }),
    ];
    expect(hasCompleteSpotCoordinates(content(spots, null))).toBe(false);
    expect(hasNavigationGeoData(content(spots, null))).toBe(false);
  });
});

describe("off-route tracker + distance", () => {
  const route = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 0.01 },
  ];

  it("returns 0 distance for an empty route and point distance for a single point", () => {
    expect(distanceToRouteM([], { lat: 1, lng: 1 })).toBe(0);
    expect(distanceToRouteM([{ lat: 0, lng: 0 }], { lat: 0, lng: 0 })).toBeCloseTo(
      0,
      1,
    );
  });

  it("marks off-route immediately and requires clearCount fixes to recover", () => {
    let tracker = createOffRouteTracker();
    const far = { lat: 0.5, lng: 0.005 };
    const near = { lat: 0, lng: 0.005 };

    tracker = updateOffRouteTracker(tracker, route, far, 10, 3);
    expect(tracker.isOffRoute).toBe(true);

    // Two on-route fixes: still latched because clearCount is 3.
    tracker = updateOffRouteTracker(tracker, route, near, 10, 3);
    tracker = updateOffRouteTracker(tracker, route, near, 10, 3);
    expect(tracker.isOffRoute).toBe(true);

    // Third on-route fix clears it.
    tracker = updateOffRouteTracker(tracker, route, near, 10, 3);
    expect(tracker.isOffRoute).toBe(false);
  });
});

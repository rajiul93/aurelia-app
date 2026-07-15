import { describe, expect, it } from "vitest";

import {
  getAllFloorScopes,
  getAllRoutes,
  getFloorName,
  getFloorScope,
  getSpotsForFloor,
} from "@/lib/bundle/floor-routing";
import { orderSpotsAcrossFloors } from "@/lib/bundle/route-order";
import { buildRouteCoordinates } from "@/lib/navigation/route-geometry";
import {
  buildNavigationMeta,
  hasCompleteRouteFootprints,
  hasNavigationGeoData,
} from "@/lib/navigation/validate-geo";
import type { BundleContent, BundleSpot } from "@/types/bundle-content";

function spot(
  id: string,
  sortOrder: number,
  floorNo: number,
  floorId: string,
  latitude: number,
  longitude: number,
): BundleSpot {
  return {
    id,
    sortOrder,
    latitude,
    longitude,
    floor: floorNo,
    floorId,
    includedInQuickTour: true,
    translations: [],
    medias: [],
    faqs: [],
  };
}

/**
 * Two floors, and floor 1's route deliberately runs against sortOrder (s2 → s1).
 * That is what makes these tests bite: if the floor's route is lost, the code
 * silently falls back to sortOrder and everything still "works", just wrongly.
 */
const v2: BundleContent = {
  tour: {
    id: "tour-1",
    slug: "colosseum",
    translations: [],
    spots: [
      spot("s1", 1, 1, "floor-1", 41.89, 12.49),
      spot("s2", 2, 1, "floor-1", 41.891, 12.491),
      spot("s3", 3, 2, "floor-2", 41.892, 12.492),
      spot("s4", 4, 2, "floor-2", 41.893, 12.493),
    ],
  },
  floors: [
    {
      id: "floor-1",
      floorNo: 1,
      mapTileUrl: "https://example.com/floor1",
      translations: [
        { language: "en", audience: "ADULTS", name: "Ground Floor" },
        { language: "es", audience: "ADULTS", name: "Planta Baja" },
      ],
      route: {
        id: "route-1",
        edges: [
          {
            id: "e1",
            fromSpotId: "s2",
            toSpotId: "s1",
            sortOrder: 1,
            footprintGeo: [
              { lat: 41.891, lng: 12.491 },
              { lat: 41.8905, lng: 12.4905 },
              { lat: 41.89, lng: 12.49 },
            ],
          },
        ],
      },
    },
    {
      id: "floor-2",
      floorNo: 2,
      mapTileUrl: "https://example.com/floor2",
      route: {
        id: "route-2",
        edges: [
          {
            id: "e2",
            fromSpotId: "s3",
            toSpotId: "s4",
            sortOrder: 1,
            footprintGeo: [
              { lat: 41.892, lng: 12.492 },
              { lat: 41.893, lng: 12.493 },
            ],
          },
        ],
      },
    },
  ],
  versions: {
    tourBundleVersion: 1,
    mediaVersion: 1,
    aiKnowledgeVersion: 1,
    routeVersion: 1,
  },
};

/** An older install: one flat route, no floors at all. */
const v1: BundleContent = {
  tour: {
    id: "tour-1",
    slug: "colosseum",
    translations: [],
    spots: [
      spot("s1", 1, 1, "", 41.89, 12.49),
      spot("s2", 2, 1, "", 41.891, 12.491),
    ],
  },
  route: {
    id: "route-1",
    edges: [
      {
        id: "e1",
        fromSpotId: "s2",
        toSpotId: "s1",
        sortOrder: 1,
        footprintGeo: [
          { lat: 41.891, lng: 12.491 },
          { lat: 41.89, lng: 12.49 },
        ],
      },
    ],
  },
  versions: {
    tourBundleVersion: 1,
    mediaVersion: 1,
    aiKnowledgeVersion: 1,
    routeVersion: 1,
  },
};

describe("getFloorScope", () => {
  it("gives a floor its own spots and route", () => {
    const scope = getFloorScope(v2, "floor-2");

    expect(scope.route?.id).toBe("route-2");
    expect(scope.spots.map((entry) => entry.id)).toEqual(["s3", "s4"]);
  });

  it("defaults to the first floor when none is asked for", () => {
    const scope = getFloorScope(v2);

    expect(scope.floorId).toBe("floor-1");
    expect(scope.route?.id).toBe("route-1");
  });

  it("treats a v1 bundle as one flat floor", () => {
    const scope = getFloorScope(v1);

    expect(scope.floorId).toBe("");
    expect(scope.route?.id).toBe("route-1");
    expect(scope.spots).toHaveLength(2);
  });

  it("keeps one floor's spots out of another's", () => {
    expect(getSpotsForFloor(v2, "floor-1").map((entry) => entry.id)).toEqual([
      "s1",
      "s2",
    ]);
  });
});

describe("route resolution on a v2 bundle", () => {
  it("follows the floor's route, not spot sortOrder", () => {
    const { spots, route } = getFloorScope(v2, "floor-1");
    const coordinates = buildRouteCoordinates(spots, route);

    // The footprint, walked s2 → s1. A straight sortOrder fallback would be two
    // points and would start at s1 instead.
    expect(coordinates).toHaveLength(3);
    expect(coordinates[0]).toEqual({ lat: 41.891, lng: 12.491 });
    expect(coordinates[2]).toEqual({ lat: 41.89, lng: 12.49 });
  });

  it("reports navigable geo per floor", () => {
    expect(hasNavigationGeoData(v2, "floor-1")).toBe(true);
    expect(hasNavigationGeoData(v2, "floor-2")).toBe(true);
    expect(hasCompleteRouteFootprints(v2, "floor-1")).toBe(true);
  });

  it("collects every floor's route", () => {
    expect(getAllRoutes(v2).map((route) => route.id)).toEqual([
      "route-1",
      "route-2",
    ]);
    expect(getAllRoutes(v1).map((route) => route.id)).toEqual(["route-1"]);
  });
});

describe("orderSpotsAcrossFloors", () => {
  it("walks floor by floor, in each floor's route order", () => {
    expect(orderSpotsAcrossFloors(v2).map((entry) => entry.id)).toEqual([
      "s2",
      "s1",
      "s3",
      "s4",
    ]);
  });

  it("still orders a v1 bundle by its single route", () => {
    expect(orderSpotsAcrossFloors(v1).map((entry) => entry.id)).toEqual([
      "s2",
      "s1",
    ]);
  });

  it("visits floors in floor number order, whatever the array order", () => {
    const reversed: BundleContent = {
      ...v2,
      floors: [v2.floors![1]!, v2.floors![0]!],
    };

    expect(orderSpotsAcrossFloors(reversed).map((entry) => entry.id)).toEqual([
      "s2",
      "s1",
      "s3",
      "s4",
    ]);
  });
});

describe("buildNavigationMeta", () => {
  it("covers every floor, so the offline map pack does too", () => {
    const meta = buildNavigationMeta(v2);

    // Floor 2 sits north-east of floor 1, past floor 1's own extent (41.891).
    // Bounds taken from floor 1 alone would crop it out of the downloaded map.
    expect(meta.mapBounds!.north).toBeGreaterThanOrEqual(41.893);
    expect(meta.mapBounds!.south).toBeLessThanOrEqual(41.89);
    expect(meta.mapBounds!.east).toBeGreaterThanOrEqual(12.493);
    expect(meta.hasCompleteFootprints).toBe(true);
    expect(meta.hasCompleteCoordinates).toBe(true);
  });

  it("marks the tour incomplete when one floor is missing footprints", () => {
    const partial: BundleContent = {
      ...v2,
      floors: [
        v2.floors![0]!,
        { ...v2.floors![1]!, route: { id: "route-2", edges: [] } },
      ],
    };

    expect(buildNavigationMeta(partial).hasCompleteFootprints).toBe(false);
  });
});

/**
 * What the server actually ships today: `toTourDto` gives each spot `floor` (the
 * number) and no `floorId`, and the builder drops floor names. Spots must still
 * land on the right floor, or a multi-floor tour arrives with every floor empty.
 */
describe("the bundle the server builds today", () => {
  const production: BundleContent = {
    ...v2,
    tour: {
      ...v2.tour,
      spots: v2.tour.spots.map(({ floorId: _floorId, ...rest }) => rest),
    },
    floors: v2.floors!.map(({ translations: _translations, ...rest }) => rest),
  };

  it("matches spots to floors by floor number when there is no floorId", () => {
    expect(getSpotsForFloor(production, "floor-1").map((s) => s.id)).toEqual([
      "s1",
      "s2",
    ]);
    expect(getSpotsForFloor(production, "floor-2").map((s) => s.id)).toEqual([
      "s3",
      "s4",
    ]);
  });

  it("still routes each floor by its own edges", () => {
    const { spots, route } = getFloorScope(production, "floor-1");

    expect(route?.id).toBe("route-1");
    expect(buildRouteCoordinates(spots, route)).toHaveLength(3);
    expect(hasNavigationGeoData(production, "floor-2")).toBe(true);
  });

  it("names an unnamed floor by its number", () => {
    expect(getFloorName(production.floors![0]!, "en", "ADULTS")).toBeNull();
  });
});

describe("getFloorName", () => {
  it("prefers the reader's language", () => {
    expect(getFloorName(v2.floors![0]!, "es", "ADULTS")).toBe("Planta Baja");
  });

  it("falls back to English, then to any translation", () => {
    expect(getFloorName(v2.floors![0]!, "fr", "CHILDREN")).toBe("Ground Floor");
  });

  it("returns null when the bundle predates floor names", () => {
    expect(getFloorName(v2.floors![1]!, "en", "ADULTS")).toBeNull();
  });
});

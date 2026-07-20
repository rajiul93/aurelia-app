import { describe, expect, it } from "vitest";

import { computeMapBounds } from "@/lib/navigation/bounds";
import { resolveDisplayBearing } from "@/lib/navigation/display-bearing";
import { isOffRoute } from "@/lib/navigation/off-route";
import { evaluateProximity } from "@/lib/navigation/proximity";
import {
  buildRouteCoordinates,
  splitRouteAtIndex,
} from "@/lib/navigation/route-geometry";
import { shouldRejectGpsFix, smoothLocation } from "@/lib/navigation/smooth-location";
import { snapToRoute } from "@/lib/navigation/snap-to-route";
import { appendWalkTrail } from "@/lib/navigation/walk-trail";
import { DEFAULT_NAVIGATION_THRESHOLDS } from "@/lib/navigation/types";
import {
  hasCompleteRouteFootprints,
  hasNavigationGeoData,
} from "@/lib/navigation/validate-geo";
import type { BundleContent } from "@/types/bundle-content";

const sampleContent: BundleContent = {
  tour: {
    id: "tour-1",
    slug: "demo",
    translations: [],
    spots: [
      {
        id: "s1",
        sortOrder: 0,
        latitude: 41.89,
        longitude: 12.49,
        floor: 0,
        includedInQuickTour: true,
        translations: [],
        medias: [],
        faqs: [],
      },
      {
        id: "s2",
        sortOrder: 1,
        latitude: 41.891,
        longitude: 12.491,
        floor: 0,
        includedInQuickTour: true,
        translations: [],
        medias: [],
        faqs: [],
      },
    ],
  },
  route: {
    id: "route-1",
    edges: [
      {
        id: "e1",
        fromSpotId: "s1",
        toSpotId: "s2",
        sortOrder: 0,
        footprintGeo: [
          { lat: 41.89, lng: 12.49 },
          { lat: 41.8905, lng: 12.4905 },
          { lat: 41.891, lng: 12.491 },
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

describe("route geometry", () => {
  it("merges footprint segments into a continuous route", () => {
    const coordinates = buildRouteCoordinates(
      sampleContent.tour.spots,
      sampleContent.route ?? null,
    );

    expect(coordinates).toHaveLength(3);
    expect(coordinates[0]).toEqual({ lat: 41.89, lng: 12.49 });
    expect(coordinates[2]).toEqual({ lat: 41.891, lng: 12.491 });
  });

  it("splits completed and upcoming route segments", () => {
    const coordinates = buildRouteCoordinates(
      sampleContent.tour.spots,
      sampleContent.route ?? null,
    );
    const split = splitRouteAtIndex(coordinates, 1);

    expect(split.completed).toHaveLength(2);
    expect(split.upcoming).toHaveLength(2);
  });
});

describe("bounds", () => {
  it("computes padded map bounds", () => {
    const bounds = computeMapBounds([
      { lat: 41.89, lng: 12.49 },
      { lat: 41.891, lng: 12.491 },
    ]);

    expect(bounds).not.toBeNull();
    expect(bounds!.north).toBeGreaterThan(41.891);
    expect(bounds!.south).toBeLessThan(41.89);
  });
});

describe("snap to route", () => {
  it("snaps a nearby point onto the route", () => {
    const coordinates = buildRouteCoordinates(
      sampleContent.tour.spots,
      sampleContent.route ?? null,
    );
    const snapped = snapToRoute(coordinates, { lat: 41.8904, lng: 12.4904 });

    expect(snapped).not.toBeNull();
    expect(snapped!.routeIndex).toBeGreaterThanOrEqual(0);
    expect(snapped!.bearing).toBeTypeOf("number");
  });
});

describe("smooth location", () => {
  it("rejects poor accuracy fixes", () => {
    const rejected = shouldRejectGpsFix(
      { lat: 41.89, lng: 12.49, accuracy: 45, heading: null, speed: null, timestamp: Date.now() },
      30,
      null,
    );

    expect(rejected).toBe(false);
  });

  it("rejects poor accuracy fixes after bootstrap", () => {
    const rejected = shouldRejectGpsFix(
      { lat: 41.89, lng: 12.49, accuracy: 45, heading: null, speed: null, timestamp: Date.now() },
      30,
      { lat: 41.88, lng: 12.48 },
    );

    expect(rejected).toBe(true);
  });

  it("smooths accepted fixes", () => {
    const first = smoothLocation(
      { lastAccepted: null, smoothed: null },
      { lat: 41.89, lng: 12.49, accuracy: 8, heading: null, speed: null, timestamp: Date.now() },
    );
    const second = smoothLocation(first, {
      lat: 41.891,
      lng: 12.491,
      accuracy: 8,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    });

    expect(first.smoothed).toEqual({ lat: 41.89, lng: 12.49 });
    expect(second.smoothed!.lat).toBeGreaterThan(41.89);
    expect(second.smoothed!.lat).toBeLessThan(41.891);
  });
});

describe("off route", () => {
  it("detects when a point is far from the route", () => {
    const coordinates = buildRouteCoordinates(
      sampleContent.tour.spots,
      sampleContent.route ?? null,
    );

    expect(isOffRoute(coordinates, { lat: 41.895, lng: 12.495 }, 10)).toBe(true);
    expect(isOffRoute(coordinates, { lat: 41.8905, lng: 12.4905 }, 10)).toBe(
      false,
    );
  });
});

describe("proximity", () => {
  it("marks approach and arrival near a stop", () => {
    const nextSpot = sampleContent.tour.spots[1]!;
    const result = evaluateProximity(
      { lat: 41.891, lng: 12.491 },
      nextSpot,
      {
        maxAccuracyM: 30,
        minMovementM: 5,
        offRouteDistanceM: 10,
        offRouteClearCount: 1,
        approachRadiusM: 30,
        arrivalRadiusM: 20,
        arrivalDwellRadiusM: 30,
        arrivalDwellMs: 10_000,
        locationSmoothAlpha: 0.62,
      },
      { spotId: null, enteredAt: null },
    );

    expect(result.shouldTriggerApproachAudio).toBe(true);
    expect(result.shouldMarkArrived).toBe(true);
  });

  // Both radii are measured against the same "next incomplete spot", and
  // crossing the arrival radius completes that spot, which advances to the next
  // one. So an approach radius inside the arrival radius describes a window
  // that never opens and the approach cue is silently never spoken.
  it("keeps the approach radius outside the arrival radius", () => {
    expect(DEFAULT_NAVIGATION_THRESHOLDS.approachRadiusM).toBeGreaterThan(
      DEFAULT_NAVIGATION_THRESHOLDS.arrivalRadiusM,
    );
  });

  it("announces the approach before the stop is marked arrived", () => {
    const nextSpot = sampleContent.tour.spots[1]!;
    const spotPoint = { lat: nextSpot.latitude!, lng: nextSpot.longitude! };
    // Sit between the two radii: ~25 m out with approach 30 m / arrival 20 m.
    const betweenRadii = {
      lat: spotPoint.lat + 0.000225,
      lng: spotPoint.lng,
    };

    const result = evaluateProximity(
      betweenRadii,
      nextSpot,
      DEFAULT_NAVIGATION_THRESHOLDS,
      { spotId: null, enteredAt: null },
    );

    expect(result.shouldTriggerApproachAudio).toBe(true);
    expect(result.shouldMarkArrived).toBe(false);
  });
});

describe("walk trail", () => {
  it("records spaced footstep points along movement", () => {
    const first = appendWalkTrail([], { lat: 41.89, lng: 12.49 });
    const second = appendWalkTrail(first, { lat: 41.89001, lng: 12.49001 }, 2);
    const third = appendWalkTrail(second, { lat: 41.891, lng: 12.491 }, 2);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(third).toHaveLength(2);
  });
});

describe("display bearing", () => {
  it("prefers device heading while moving", () => {
    const snapped = snapToRoute(
      buildRouteCoordinates(sampleContent.tour.spots, sampleContent.route ?? null),
      { lat: 41.8905, lng: 12.4905 },
    );

    expect(
      resolveDisplayBearing({
        snapped,
        heading: 120,
        speed: 1.2,
      }),
    ).toBe(120);
  });
});

describe("validate geo", () => {
  it("validates navigation-ready bundle content", () => {
    expect(hasCompleteRouteFootprints(sampleContent)).toBe(true);
    expect(hasNavigationGeoData(sampleContent)).toBe(true);
  });
});

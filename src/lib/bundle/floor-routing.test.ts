import { describe, it, expect } from "vitest";
import type { BundleContent } from "@/types/bundle-content";
import {
  getRouteForFloor,
  getDefaultFloorId,
  getFloorIds,
  isMultiFloor,
} from "./floor-routing";

describe("FloorRouting", () => {
  const mockV1Content: BundleContent = {
    tour: {
      id: "tour-1",
      slug: "tour-1",
      translations: [],
      spots: [],
    },
    route: {
      id: "route-1",
      edges: [],
    },
    versions: {
      tourBundleVersion: 1,
      mediaVersion: 1,
      aiKnowledgeVersion: 1,
      routeVersion: 1,
    },
  };

  const mockV2Content: BundleContent = {
    tour: {
      id: "tour-1",
      slug: "tour-1",
      translations: [],
      spots: [],
    },
    floors: [
      {
        id: "floor-1",
        floorNo: 1,
        route: {
          id: "route-1",
          edges: [],
        },
      },
      {
        id: "floor-2",
        floorNo: 2,
        route: {
          id: "route-2",
          edges: [],
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

  describe("getRouteForFloor", () => {
    it("should return v1 route regardless of floorId", () => {
      const route = getRouteForFloor(mockV1Content, "any-id");
      expect(route).toBe(mockV1Content.route);
    });

    it("should return correct floor route in v2 format", () => {
      const route1 = getRouteForFloor(mockV2Content, "floor-1");
      const route2 = getRouteForFloor(mockV2Content, "floor-2");

      expect(route1?.id).toBe("route-1");
      expect(route2?.id).toBe("route-2");
    });

    it("should return null for non-existent floor in v2", () => {
      const route = getRouteForFloor(mockV2Content, "floor-999");
      expect(route).toBeNull();
    });
  });

  describe("getDefaultFloorId", () => {
    it("should return empty string for v1 format", () => {
      expect(getDefaultFloorId(mockV1Content)).toBe("");
    });

    it("should return first floor ID for v2 format", () => {
      expect(getDefaultFloorId(mockV2Content)).toBe("floor-1");
    });
  });

  describe("getFloorIds", () => {
    it("should return empty array for v1 format", () => {
      expect(getFloorIds(mockV1Content)).toEqual([]);
    });

    it("should return all floor IDs for v2 format", () => {
      expect(getFloorIds(mockV2Content)).toEqual(["floor-1", "floor-2"]);
    });
  });

  describe("isMultiFloor", () => {
    it("should return false for v1 format", () => {
      expect(isMultiFloor(mockV1Content)).toBe(false);
    });

    it("should return false for v2 single-floor", () => {
      const singleFloorV2: BundleContent = {
        ...mockV2Content,
        floors: [mockV2Content.floors![0]],
      };
      expect(isMultiFloor(singleFloorV2)).toBe(false);
    });

    it("should return true for v2 multi-floor", () => {
      expect(isMultiFloor(mockV2Content)).toBe(true);
    });
  });
});

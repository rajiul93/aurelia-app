import { useMemo, useState } from "react";
import type { BundleContent } from "@/types/bundle-content";
import {
  getDefaultFloorId,
  getFloorIds,
  getRouteForFloor,
  isMultiFloor,
} from "@/lib/bundle/floor-routing";

/**
 * Manages floor selection for multi-floor tours
 * Returns the selected floor ID and helper methods
 */
export function useFloorSelection(
  content: BundleContent | null,
  initialFloorId?: string,
) {
  const floorIds = useMemo(() => (content ? getFloorIds(content) : []), [content]);

  const [selectedFloorId, setSelectedFloorId] = useState<string>(() => {
    if (!content) return initialFloorId ?? "";
    // Honour a deep link into a specific floor (a home-screen floor card), but
    // only if it exists in this bundle; otherwise fall back to the first floor.
    if (initialFloorId && getFloorIds(content).includes(initialFloorId)) {
      return initialFloorId;
    }
    return getDefaultFloorId(content);
  });

  // Ensure selectedFloorId is valid when content changes
  const validatedFloorId = useMemo(() => {
    if (!content) return "";

    const ids = getFloorIds(content);
    if (ids.length === 0) {
      return ""; // v1 single-floor
    }

    // If selected floor no longer exists, pick the first available
    if (!ids.includes(selectedFloorId)) {
      return ids[0]!;
    }

    return selectedFloorId;
  }, [content, selectedFloorId]);

  const isMultiFloorTour = useMemo(
    () => (content ? isMultiFloor(content) : false),
    [content],
  );

  const currentRoute = useMemo(
    () => (content ? getRouteForFloor(content, validatedFloorId) : null),
    [content, validatedFloorId],
  );

  return {
    selectedFloorId: validatedFloorId,
    setSelectedFloorId,
    floorIds,
    isMultiFloor: isMultiFloorTour,
    currentRoute,
  };
}

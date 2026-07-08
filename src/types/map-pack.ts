import type { MapBounds } from "@/lib/navigation/types";

export type MapPackMeta = {
  packName: string;
  bounds: MapBounds;
  minZoom: number;
  maxZoom: number;
  byteSize: number | null;
  status: "pending" | "ready" | "failed";
  downloadedAt: string | null;
  errorMessage?: string | null;
};

export const MAP_PACK_META_FILE = "map-pack-meta.json";
// Widened so zoomed-out route fits (below the old 14) and the follow zoom (16)
// both land on cached tiles offline; a blank base tile prevents the footprint
// GeoJSON layers from attaching.
export const MAP_MIN_ZOOM = 12;
export const MAP_MAX_ZOOM = 17;

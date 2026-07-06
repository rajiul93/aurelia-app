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
export const MAP_MIN_ZOOM = 14;
export const MAP_MAX_ZOOM = 16;

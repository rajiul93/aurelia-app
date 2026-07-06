import { Directory, File } from "expo-file-system";

import { getInstalledTourDirectory } from "@/lib/bundle/tour-directory";
import { isMapLibreNativeAvailable } from "@/lib/map/native-available";
import { buildNavigationMeta } from "@/lib/navigation/validate-geo";
import {
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_PACK_META_FILE,
  type MapPackMeta,
} from "@/types/map-pack";
import type { BundleContent } from "@/types/bundle-content";

import { getTourMapPackName, getTourMapStyle } from "./style";

type OfflinePackProgressListener = (
  pack: unknown,
  status: { percentage: number },
) => void;

type OfflinePackError = { message: string };

async function loadOfflineManager() {
  const { OfflineManager } = await import("@maplibre/maplibre-react-native");
  return OfflineManager;
}

export function buildMapPackMeta(content: BundleContent): MapPackMeta | null {
  const navigation = buildNavigationMeta(content);

  if (!navigation.mapBounds) {
    return null;
  }

  return {
    packName: getTourMapPackName(content.tour.id),
    bounds: navigation.mapBounds,
    minZoom: MAP_MIN_ZOOM,
    maxZoom: MAP_MAX_ZOOM,
    byteSize: null,
    status: "pending",
    downloadedAt: null,
    errorMessage: null,
  };
}

export async function readMapPackMeta(
  tourId: string,
): Promise<MapPackMeta | null> {
  const file = new File(getInstalledTourDirectory(tourId), MAP_PACK_META_FILE);

  if (!file.exists) {
    return null;
  }

  try {
    return JSON.parse(await file.text()) as MapPackMeta;
  } catch {
    return null;
  }
}

function writeMapPackMeta(tourId: string, meta: MapPackMeta) {
  const directory = getInstalledTourDirectory(tourId);
  const mapDirectory = new Directory(directory, "map");
  if (!mapDirectory.exists) {
    mapDirectory.create({ idempotent: true });
  }

  const file = new File(directory, MAP_PACK_META_FILE);
  file.write(JSON.stringify(meta));
}

export async function ensureOfflineMapPack(
  tourId: string,
  content: BundleContent,
  onProgress?: (completed: number, total: number) => void,
): Promise<MapPackMeta | null> {
  const baseMeta = buildMapPackMeta(content);

  if (!baseMeta) {
    return null;
  }

  writeMapPackMeta(tourId, baseMeta);
  onProgress?.(0, 100);

  if (!isMapLibreNativeAvailable()) {
    const unavailableMeta: MapPackMeta = {
      ...baseMeta,
      status: "failed",
      downloadedAt: null,
      errorMessage: "Offline maps require a development build with MapLibre.",
    };
    writeMapPackMeta(tourId, unavailableMeta);
    onProgress?.(100, 100);
    return unavailableMeta;
  }

  try {
    const OfflineManager = await loadOfflineManager();
    const existingPack = await OfflineManager.getPack(baseMeta.packName);

    if (existingPack) {
      const readyMeta: MapPackMeta = {
        ...baseMeta,
        status: "ready",
        downloadedAt: new Date().toISOString(),
      };
      writeMapPackMeta(tourId, readyMeta);
      onProgress?.(100, 100);
      return readyMeta;
    }

    const progressListener: OfflinePackProgressListener = (_pack, status) => {
      onProgress?.(Math.round(status.percentage), 100);
    };
    const errorListener = (_pack: unknown, error: OfflinePackError) => {
      throw new Error(error.message);
    };

    await OfflineManager.createPack(
      {
        mapStyle: getTourMapStyle(),
        bounds: [
          baseMeta.bounds.west,
          baseMeta.bounds.south,
          baseMeta.bounds.east,
          baseMeta.bounds.north,
        ],
        minZoom: baseMeta.minZoom,
        maxZoom: baseMeta.maxZoom,
        metadata: { tourId },
      },
      progressListener,
      errorListener,
    );

    const readyMeta: MapPackMeta = {
      ...baseMeta,
      status: "ready",
      downloadedAt: new Date().toISOString(),
    };
    writeMapPackMeta(tourId, readyMeta);
    onProgress?.(100, 100);
    return readyMeta;
  } catch (error) {
    const failedMeta: MapPackMeta = {
      ...baseMeta,
      status: "failed",
      downloadedAt: null,
      errorMessage:
        error instanceof Error ? error.message : "Map pack download failed",
    };
    writeMapPackMeta(tourId, failedMeta);
    onProgress?.(100, 100);
    return failedMeta;
  }
}

export async function deleteOfflineMapPack(tourId: string) {
  const meta = await readMapPackMeta(tourId);

  if (!meta || !isMapLibreNativeAvailable()) {
    return;
  }

  try {
    const OfflineManager = await loadOfflineManager();
    await OfflineManager.deletePack(meta.packName);
  } catch {
    // Ignore missing native module during cleanup.
  }

  const directory = getInstalledTourDirectory(tourId);
  const metaFile = new File(directory, MAP_PACK_META_FILE);
  if (metaFile.exists) {
    metaFile.delete();
  }
}

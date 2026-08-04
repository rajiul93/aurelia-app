import * as Device from "expo-device";

/**
 * Total RAM below which we never attempt on-device generation.
 *
 * Gemma 3 1B at int4 is ~0.5 GB of weights, but the KV cache, the llama.cpp
 * scratch buffers and the app's own footprint (MapLibre tiles, decoded media,
 * the JS heap) all sit on top — call it ~1.5 GB while answering. A 4 GB phone
 * running the map and GPS at the same time does not have that spare, and the
 * failure mode is not a slow answer, it is the OS killing the app mid-tour.
 *
 * 6 GB is the agreed floor: mid-range and better. Everything below silently
 * uses the retrieval assistant, which is the pre-existing behaviour and costs
 * nothing.
 */
const MIN_TOTAL_MEMORY_BYTES = 6 * 1024 * 1024 * 1024;

export type DeviceCapability = {
  canRunModel: boolean;
  /** Total device RAM in bytes, or null when the platform will not report it. */
  totalMemoryBytes: number | null;
  /** Why generation is off, for logs and the settings screen. Null when it is on. */
  reason: "low_memory" | "unknown_memory" | "simulator" | null;
};

let cached: DeviceCapability | null = null;

function evaluate(): DeviceCapability {
  // A simulator reports the host Mac's RAM, so the memory check below would
  // wave through a device class that tells us nothing about a real phone.
  // Generation still runs (CPU-only, slow) — it is only the *gate* that cannot
  // be trusted, so this is reported rather than blocked.
  if (!Device.isDevice) {
    return {
      canRunModel: true,
      totalMemoryBytes: Device.totalMemory,
      reason: "simulator",
    };
  }

  const totalMemoryBytes = Device.totalMemory;

  // Treated as "no" rather than "probably fine": guessing wrong here costs an
  // OOM kill on a device we know nothing about, and the fallback is a working
  // assistant, not a broken one.
  if (totalMemoryBytes === null || !Number.isFinite(totalMemoryBytes)) {
    return { canRunModel: false, totalMemoryBytes: null, reason: "unknown_memory" };
  }

  if (totalMemoryBytes < MIN_TOTAL_MEMORY_BYTES) {
    return { canRunModel: false, totalMemoryBytes, reason: "low_memory" };
  }

  return { canRunModel: true, totalMemoryBytes, reason: null };
}

/**
 * Whether this device may run the on-device model.
 *
 * Memoized: the inputs are fixed for the lifetime of the process, and this is
 * read on the path of every question asked.
 */
export function getDeviceCapability(): DeviceCapability {
  cached ??= evaluate();
  return cached;
}

/** Test seam — the module-level cache would otherwise leak between cases. */
export function resetDeviceCapabilityCache() {
  cached = null;
}

export const MIN_TOTAL_MEMORY_BYTES_FOR_LLM = MIN_TOTAL_MEMORY_BYTES;

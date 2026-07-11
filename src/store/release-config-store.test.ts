import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_RELEASE_CONFIG } from "@/lib/release-config/defaults";
import {
  loadCachedReleaseConfig,
  saveCachedReleaseConfig,
} from "@/lib/release-config/storage";
import { useReleaseConfigStore } from "@/store/release-config-store";

// Hoisted above the imports by Vitest, so the store sees the mocked storage.
vi.mock("@/lib/release-config/storage", () => ({
  loadCachedReleaseConfig: vi.fn(async () => null),
  saveCachedReleaseConfig: vi.fn(async () => {}),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useReleaseConfigStore.setState({
    config: DEFAULT_RELEASE_CONFIG,
    hydrated: false,
  });
});

describe("release-config-store", () => {
  it("falls back to the default config when nothing is cached", async () => {
    vi.mocked(loadCachedReleaseConfig).mockResolvedValueOnce(null);

    await useReleaseConfigStore.getState().hydrate();

    const state = useReleaseConfigStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.config).toEqual(DEFAULT_RELEASE_CONFIG);
  });

  it("uses the cached config when present", async () => {
    const cached = {
      ...DEFAULT_RELEASE_CONFIG,
      appContentVersion: DEFAULT_RELEASE_CONFIG.appContentVersion + 1,
    };
    vi.mocked(loadCachedReleaseConfig).mockResolvedValueOnce(cached);

    await useReleaseConfigStore.getState().hydrate();

    expect(useReleaseConfigStore.getState().config).toEqual(cached);
  });

  it("persists and applies a new config via setConfig", async () => {
    const next = {
      ...DEFAULT_RELEASE_CONFIG,
      appContentVersion: DEFAULT_RELEASE_CONFIG.appContentVersion + 5,
    };

    await useReleaseConfigStore.getState().setConfig(next);

    expect(saveCachedReleaseConfig).toHaveBeenCalledWith(next);
    expect(useReleaseConfigStore.getState().config).toEqual(next);
  });
});

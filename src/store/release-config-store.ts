import { create } from "zustand";

import { DEFAULT_RELEASE_CONFIG } from "@/lib/release-config/defaults";
import {
  loadCachedReleaseConfig,
  saveCachedReleaseConfig,
} from "@/lib/release-config/storage";
import type { ReleaseConfig } from "@/types/release-config";

type ReleaseConfigState = {
  config: ReleaseConfig;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setConfig: (config: ReleaseConfig) => Promise<void>;
};

export const useReleaseConfigStore = create<ReleaseConfigState>((set) => ({
  config: DEFAULT_RELEASE_CONFIG,
  hydrated: false,

  async hydrate() {
    const cached = await loadCachedReleaseConfig();

    set({
      config: cached ?? DEFAULT_RELEASE_CONFIG,
      hydrated: true,
    });
  },

  async setConfig(config) {
    await saveCachedReleaseConfig(config);
    set({ config });
  },
}));

export function useRemoteConfig() {
  return useReleaseConfigStore((state) => state.config.remote);
}

export function useReleaseVersions() {
  return useReleaseConfigStore((state) => ({
    appContentVersion: state.config.appContentVersion,
    schemaVersion: state.config.schemaVersion,
    remoteConfigVersion: state.config.remoteConfigVersion,
  }));
}

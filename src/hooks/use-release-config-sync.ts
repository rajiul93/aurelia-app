import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useVersions } from "@/hooks/queries/use-versions";
import { queryKeys } from "@/lib/query/keys";
import { releaseConfigService } from "@/services/release-config.service";
import { useReleaseConfigStore } from "@/store/release-config-store";
import type { ReleaseConfig } from "@/types/release-config";

type VersionSnapshot = {
  appContentVersion: number;
  schemaVersion: number;
  remoteConfigVersion: number;
};

export function useReleaseConfigSync() {
  const queryClient = useQueryClient();
  const setConfig = useReleaseConfigStore((state) => state.setConfig);
  const snapshotRef = useRef<VersionSnapshot | null>(null);
  const { data, refetch } = useVersions();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refetch();
      }
    });

    return () => subscription.remove();
  }, [refetch]);

  useEffect(() => {
    if (!data?.data) {
      return;
    }

    const nextSnapshot: VersionSnapshot = {
      appContentVersion: data.data.appContentVersion,
      schemaVersion: data.data.schemaVersion,
      remoteConfigVersion: data.data.remoteConfigVersion ?? 1,
    };

    const previous = snapshotRef.current;
    snapshotRef.current = nextSnapshot;

    async function syncReleaseConfig() {
      try {
        const response = await releaseConfigService.get();
        const nextConfig: ReleaseConfig = {
          ...response.data,
          syncedAt: new Date().toISOString(),
        };

        await setConfig(nextConfig);
      } catch {
        // Keep cached config when server config is not published yet.
      }
    }

    void syncReleaseConfig();

    if (!previous) {
      return;
    }

    if (previous.appContentVersion !== nextSnapshot.appContentVersion) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appContent.all,
      });
    }

    if (previous.schemaVersion !== nextSnapshot.schemaVersion) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.catalog.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.entitlements.all,
      });
    }
  }, [data, queryClient, setConfig]);
}

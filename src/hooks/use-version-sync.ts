import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/store/auth-store";
import { useVersions } from "@/hooks/queries/use-versions";
import { queryKeys } from "@/lib/query/keys";

type Snapshot = {
  appContentVersion: number;
  schemaVersion: number;
};

export function useVersionSync() {
  const queryClient = useQueryClient();
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const snapshotRef = useRef<Snapshot | null>(null);
  const { data, refetch } = useVersions();

  useEffect(() => {
    if (!sessionToken) {
      snapshotRef.current = null;
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refetch();
      }
    });

    return () => subscription.remove();
  }, [refetch, sessionToken]);

  useEffect(() => {
    if (!sessionToken || !data?.data) {
      return;
    }

    const nextSnapshot: Snapshot = {
      appContentVersion: data.data.appContentVersion,
      schemaVersion: data.data.schemaVersion,
    };

    const previous = snapshotRef.current;
    snapshotRef.current = nextSnapshot;

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
  }, [data, queryClient, sessionToken]);
}

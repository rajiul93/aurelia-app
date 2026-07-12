import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { findExpiredInstalledTours } from "@/lib/bundle/expiry";
import { loadInstalledTour } from "@/lib/bundle/load";
import { queryKeys } from "@/lib/query/keys";
import { useEntitlementsStore } from "@/store/entitlements-store";
import { useInstalledToursStore } from "@/store/installed-tours-store";

/**
 * Keeps the installed-tours store and React Query disk cache aligned on cold
 * start and when the app returns to the foreground, and removes tours whose
 * access window has ended.
 *
 * The expiry sweep runs once per app process, not on every foreground: a tour
 * that expires mid-session locks immediately (the lock is a live, local check)
 * and is only deleted on the next launch, so the user gets a chance to renew
 * before their download disappears.
 */
export function InstalledToursRehydrateListener() {
  const queryClient = useQueryClient();
  const hydrate = useInstalledToursStore((state) => state.hydrate);
  const rehydratingRef = useRef(false);
  const sweptRef = useRef(false);

  useEffect(() => {
    async function sweepExpiredTours() {
      if (sweptRef.current) {
        return;
      }

      sweptRef.current = true;

      const store = useInstalledToursStore.getState();
      const entitlements =
        useEntitlementsStore.getState().snapshot?.entitlements ?? null;
      const expiredTourIds = findExpiredInstalledTours(
        Object.values(store.installedByTourId),
        entitlements,
      );

      for (const tourId of expiredTourIds) {
        await store.remove(tourId);
        queryClient.removeQueries({
          queryKey: queryKeys.installedTour.detail(tourId),
        });
      }
    }

    async function syncInstalledTours() {
      if (rehydratingRef.current) {
        return;
      }

      rehydratingRef.current = true;

      try {
        await hydrate();
        await sweepExpiredTours();
        const installed = Object.values(
          useInstalledToursStore.getState().installedByTourId,
        );

        await Promise.all(
          installed.map((meta) =>
            queryClient.prefetchQuery({
              queryKey: queryKeys.installedTour.detail(meta.tourId),
              queryFn: async () => {
                const bundle = await loadInstalledTour(meta.tourId);
                if (!bundle) {
                  throw new Error(`Installed tour missing on disk: ${meta.tourId}`);
                }
                return bundle;
              },
              staleTime: Number.POSITIVE_INFINITY,
            }),
          ),
        );
      } finally {
        rehydratingRef.current = false;
      }
    }

    void syncInstalledTours();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }

      void syncInstalledTours();
    });

    return () => subscription.remove();
  }, [hydrate, queryClient]);

  return null;
}

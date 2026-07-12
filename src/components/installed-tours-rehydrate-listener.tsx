import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useInstalledToursStore } from "@/store/installed-tours-store";

/**
 * Re-reads installed tour records from disk when the app returns to the
 * foreground. Covers cold-start/offline cases where the in-memory store was
 * empty even though bundles are on disk.
 */
export function InstalledToursRehydrateListener() {
  const hydrate = useInstalledToursStore((state) => state.hydrate);
  const hydrated = useInstalledToursStore((state) => state.hydrated);
  const installedCount = useInstalledToursStore(
    (state) => Object.keys(state.installedByTourId).length,
  );
  const rehydratingRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" || rehydratingRef.current) {
        return;
      }

      if (hydrated && installedCount > 0) {
        return;
      }

      rehydratingRef.current = true;
      void hydrate().finally(() => {
        rehydratingRef.current = false;
      });
    });

    return () => subscription.remove();
  }, [hydrate, hydrated, installedCount]);

  return null;
}

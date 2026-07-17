import { useEffect, useRef } from "react";

import { useAppContent } from "@/hooks/queries/use-app-content";
import { prefetchBackgrounds } from "@/lib/app-content/prefetch-backgrounds";
import { useRemoteConfig } from "@/store/release-config-store";

/**
 * Warms the time-of-day background images once app content is known — from the
 * disk snapshot on a cold start, or from the fetch that follows. Fire-and-forget
 * and idempotent enough: expo-image skips URLs it already has cached.
 */
export function useBackgroundPrefetch() {
  const { data } = useAppContent();
  const { venueTimezone } = useRemoteConfig();
  const assets = data?.data.assets;
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!assets) {
      return;
    }

    // Re-run only when the actual URLs change, not on every re-render or
    // identity change of the query result.
    const key = `${venueTimezone}|${Object.values(assets)
      .map((asset) => asset.url)
      .join(",")}`;

    if (lastKeyRef.current === key) {
      return;
    }
    lastKeyRef.current = key;

    void prefetchBackgrounds(assets, venueTimezone);
  }, [assets, venueTimezone]);
}

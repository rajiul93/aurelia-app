import { useEffect, useRef } from "react";

import { useAppContent } from "@/hooks/queries/use-app-content";
import { prefetchBackgrounds } from "@/lib/app-content/prefetch-backgrounds";
import { useRemoteConfig } from "@/store/release-config-store";

/**
 * Keeps the time-of-day background images warm as app content *changes* — a new
 * CMS payload, or a venueTimezone that only arrived with the first config sync.
 *
 * The cold-start warm is no longer this hook's job: it lives inside the provider
 * tree, which only mounts after `useAppBootstrap` reports ready, so anything it
 * warmed arrived after the splash had already revealed the screen. The bootstrap
 * does that first pass now. The overlap is harmless — the `lastKeyRef` guard
 * skips a repeat of the same URL set, and expo-image skips URLs it has cached.
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

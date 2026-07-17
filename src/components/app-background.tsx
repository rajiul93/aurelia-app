import type { ReactNode } from "react";

import { PageBackground } from "@/components/page-background";
import { useAppContent } from "@/hooks/queries/use-app-content";
import {
  getCurrentTimeOfDay,
  resolveAppBackgroundUrl,
} from "@/lib/app-content/resolve-asset";
import { useRemoteConfig } from "@/store/release-config-store";

type AppBackgroundProps = {
  children: ReactNode;
};

/**
 * App-wide mobile background image (same asset as Home). Lives once at the root
 * so every screen can stay transparent and share one photo without re-wrapping.
 *
 * The URL stays remote on purpose — expo-image serves it from its own disk
 * cache first and only reaches the network on a miss, so there is nothing for a
 * hand-rolled local-file layer to add. What makes this work offline is that
 * `useAppContent` now knows the URL from disk on a cold start.
 */
export function AppBackground({ children }: AppBackgroundProps) {
  const { data } = useAppContent();
  const { venueTimezone } = useRemoteConfig();
  // The venue's slot, not the device's: a visitor in another zone should still
  // see the photo that matches the light outside the window.
  const uri = resolveAppBackgroundUrl(
    data?.data.assets,
    getCurrentTimeOfDay(venueTimezone),
  );

  return (
    <PageBackground uri={uri} imagePosition="right" noOverlay>
      {children}
    </PageBackground>
  );
}

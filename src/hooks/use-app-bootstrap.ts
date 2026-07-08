import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  useFonts,
} from "@expo-google-fonts/roboto";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/store/auth-store";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { useLocaleStore } from "@/store/locale-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useReleaseConfigStore } from "@/store/release-config-store";
import { useSpotBookmarksStore } from "@/store/spot-bookmarks-store";
import { useThemeStore } from "@/store/theme-store";
import { useTourProgressStore } from "@/store/tour-progress-store";

// Minimum time the full-screen splash stays up, so it is actually seen (and
// doesn't flash by) when hydration finishes almost instantly. If hydration
// takes longer, the splash naturally stays until it completes.
const MIN_SPLASH_MS = 900;

/**
 * Drives the app's offline bootstrap: loads fonts and hydrates every persisted
 * store from on-device storage. Returns `true` only once fonts are ready *and*
 * all hydration has settled, so the splash screen can stay visible until the
 * app is fully initialised offline (no network required).
 *
 * `Promise.allSettled` guarantees a single failing store can never leave the
 * app stuck on the splash forever.
 */
export function useAppBootstrap(): boolean {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });
  const [hydrated, setHydrated] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.allSettled([
      useAuthStore.getState().hydrate(),
      useInstalledToursStore.getState().hydrate(),
      useTourProgressStore.getState().hydrate(),
      useSpotBookmarksStore.getState().hydrate(),
      useReleaseConfigStore.getState().hydrate(),
      useLocaleStore.getState().hydrate(),
      useOnboardingStore.getState().hydrate(),
      useKnowledgeStore.getState().hydrate(),
      useThemeStore.getState().hydrate(),
    ]).then(() => {
      if (!cancelled) {
        setHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return fontsLoaded && hydrated && minTimeElapsed;
}

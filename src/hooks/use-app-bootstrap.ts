import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  useFonts,
} from "@expo-google-fonts/roboto";
import { Asset } from "expo-asset";
import { useEffect, useState } from "react";

import { FALLBACK_BACKGROUND } from "@/lib/app-content/fallback-background";
import { prefetchBackgrounds } from "@/lib/app-content/prefetch-backgrounds";
import { rescheduleAllReminders } from "@/lib/tour-reminder/scheduler";
import { useAppContentStore } from "@/store/app-content-store";
import { useAuthStore } from "@/store/auth-store";
import { useEntitlementsStore } from "@/store/entitlements-store";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { useLocaleStore } from "@/store/locale-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useReleaseConfigStore } from "@/store/release-config-store";
import { useSpotBookmarksStore } from "@/store/spot-bookmarks-store";
import { useThemeStore } from "@/store/theme-store";
import { useTourProgressStore } from "@/store/tour-progress-store";
import { useTourReminderStore } from "@/store/tour-reminder-store";

// Minimum time the full-screen splash stays up, so it is actually seen (and
// doesn't flash by) when hydration finishes almost instantly. If hydration
// takes longer, the splash naturally stays until it completes.
const MIN_SPLASH_MS = 900;

/**
 * Drives the app's offline bootstrap: loads fonts, hydrates every persisted
 * store from on-device storage, and warms the background image. Returns `true`
 * only once all of that has settled, so the splash screen stays visible until
 * the app is fully initialised offline (no network required).
 *
 * Warming the background belongs *here* rather than in `useBackgroundPrefetch`:
 * the provider tree (and with it react-query, AppBackground, and that hook)
 * only mounts once this returns true, so anything it warms arrives too late for
 * the frame the splash reveals.
 *
 * `Promise.allSettled` guarantees a single failing store can never leave the
 * app stuck on the splash forever; the asset load is `.catch()`ed for the same
 * reason.
 */
export function useAppBootstrap(): boolean {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });
  const [hydrated, setHydrated] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [assetsWarmed, setAssetsWarmed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.allSettled([
      useAuthStore.getState().hydrate(),
      useEntitlementsStore.getState().hydrate(),
      useInstalledToursStore.getState().hydrate(),
      useTourProgressStore.getState().hydrate(),
      useSpotBookmarksStore.getState().hydrate(),
      useReleaseConfigStore.getState().hydrate(),
      // Independent of the locale store hydrating alongside it: the snapshot
      // records the language it was fetched for, and the query reconciles.
      useAppContentStore.getState().hydrate(),
      useLocaleStore.getState().hydrate(),
      useOnboardingStore.getState().hydrate(),
      useKnowledgeStore.getState().hydrate(),
      useThemeStore.getState().hydrate(),
      useTourReminderStore.getState().hydrate(),
    ]).then(() => {
      if (!cancelled) {
        setHydrated(true);
      }

      // The stores now hold whatever the disk knew, so the current slot's photo
      // can be warmed into expo-image's cache while the splash is still up.
      // Deliberately not awaited: this may reach the network, and the splash
      // must never wait on it. On a warm start it is a cache hit and returns
      // almost immediately, which is what makes the reveal seamless.
      const { content } = useAppContentStore.getState();
      const { venueTimezone } = useReleaseConfigStore.getState().config.remote;
      void prefetchBackgrounds(content?.assets, venueTimezone).catch(
        () => undefined,
      );

      // Cold-start resync so timezone/clock drift self-heals. Fire-and-forget:
      // it must never hold up the splash, and needs no permission to be a no-op.
      void rescheduleAllReminders().catch(() => undefined);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Local-only, so this never puts the splash on the network's clock: in a
    // release build the asset is already inside the binary and resolves almost
    // instantly (it is fetched from Metro in dev). Gating `ready` on it means
    // the fallback is decode-ready the moment the overlay fades.
    void Asset.loadAsync(FALLBACK_BACKGROUND)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setAssetsWarmed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return fontsLoaded && hydrated && minTimeElapsed && assetsWarmed;
}

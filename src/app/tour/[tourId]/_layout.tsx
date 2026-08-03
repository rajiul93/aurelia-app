import { Stack, useLocalSearchParams } from "expo-router";
import { Platform } from "react-native";

import { TourAccessLockScreen } from "@/components/tours/tour-access-lock-screen";
import { useEntitlementStatus } from "@/hooks/use-entitlement-status";
import { useInstalledToursStore } from "@/store/installed-tours-store";

/**
 * A Stack, not a Slot. Every route under a tour — the floor picker, a floor's
 * stop list, a spot's detail, nav — lives here, and under `<Slot>` they swapped
 * with **no transition at all**: the outer stack sees them as one screen, so the
 * content was replaced in a single frame. That hard swap is what read as the
 * page jumping on floor → stops and stop → detail.
 */
function TourStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        freezeOnBlur: true,
        // Matches the outer stacks: scenes are transparent over one shared
        // photo, so a slide drags both screens' content across it.
        animation: Platform.OS === "android" ? "fade" : "default",
        animationDuration: Platform.OS === "android" ? 200 : 250,
      }}
    />
  );
}

export default function TourIdLayout() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const { getTourLockReason } = useEntitlementStatus();
  const installedTitle = useInstalledToursStore(
    (state) => state.installedByTourId[tourId ?? ""]?.title,
  );

  if (!tourId) {
    return <TourStack />;
  }

  // Never gate behind a spinner — that flash is what felt like lag when
  // opening prepare/download from Home. Snapshot-backed lock is sync.
  const lockReason = getTourLockReason(tourId);

  if (lockReason) {
    return (
      <TourAccessLockScreen tourTitle={installedTitle} reason={lockReason} />
    );
  }

  return <TourStack />;
}

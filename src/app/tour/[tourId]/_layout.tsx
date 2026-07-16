import { Slot, useLocalSearchParams } from "expo-router";

import { TourAccessLockScreen } from "@/components/tours/tour-access-lock-screen";
import { useEntitlementStatus } from "@/hooks/use-entitlement-status";
import { useInstalledToursStore } from "@/store/installed-tours-store";

export default function TourIdLayout() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const { getTourLockReason } = useEntitlementStatus();
  const installedTitle = useInstalledToursStore(
    (state) => state.installedByTourId[tourId ?? ""]?.title,
  );

  if (!tourId) {
    return <Slot />;
  }

  // Never gate behind a spinner — that flash is what felt like lag when
  // opening prepare/download from Home. Snapshot-backed lock is sync.
  const lockReason = getTourLockReason(tourId);

  if (lockReason) {
    return (
      <TourAccessLockScreen tourTitle={installedTitle} reason={lockReason} />
    );
  }

  return <Slot />;
}
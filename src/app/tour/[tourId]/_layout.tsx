import { Slot, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { TourAccessLockScreen } from "@/components/tours/tour-access-lock-screen";
import { ThemedView } from "@/components/themed-view";
import { useEntitlementStatus } from "@/hooks/use-entitlement-status";
import { useInstalledToursStore } from "@/store/installed-tours-store";

export default function TourIdLayout() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const { isLoadingAccess, getTourLockReason } = useEntitlementStatus();
  const installedTitle = useInstalledToursStore(
    (state) => state.installedByTourId[tourId ?? ""]?.title,
  );

  if (!tourId) {
    return <Slot />;
  }

  if (isLoadingAccess) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  const lockReason = getTourLockReason(tourId);

  if (lockReason) {
    return (
      <TourAccessLockScreen tourTitle={installedTitle} reason={lockReason} />
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

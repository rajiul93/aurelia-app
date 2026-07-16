import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HostCard } from "@/components/host/host-card";
import { LocationPermissionPrimer } from "@/components/host/location-permission-primer";
import { ScreenHeader } from "@/components/screen-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { GlassCard } from "@/components/ui/glass-card";
import { Spacing } from "@/constants/theme";
import { useHostDirections } from "@/hooks/mutations/useHostDirections";
import { useHosts } from "@/hooks/queries/useHosts";
import { useHostVisitorLocation } from "@/hooks/useHostVisitorLocation";
import { useTheme } from "@/hooks/use-theme";
import { useTourAccess } from "@/hooks/useTourAccess";
import { distanceBetweenPointsM } from "@/lib/distance";
import type { Host } from "@/types/host";

const DIRECTIONS_MOVEMENT_THRESHOLD_M = 25;

export default function FindHostScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  /** Throttle auto-fetch only — never read during render. */
  const lastAutoDirectionsRef = useRef<{
    hostId: string;
    distance: number;
  } | null>(null);
  /** Host the current directions request/result belongs to — safe for render. */
  const [directionsHostId, setDirectionsHostId] = useState<string | null>(null);

  const { data: access, isLoading: isCheckingAccess } = useTourAccess(tourId!);
  const {
    data: hosts = [],
    isLoading: isLoadingHosts,
    isError: isHostsError,
    refetch: refetchHosts,
  } = useHosts(tourId!);
  const {
    status: locationStatus,
    position: userPosition,
    requestPermission,
    initializing,
  } = useHostVisitorLocation();
  const [skippedLocation, setSkippedLocation] = useState(false);
  const directionsMutation = useHostDirections();

  useEffect(() => {
    if (!userPosition || !hosts.length) return;

    const firstHost = hosts[0];
    const distance = distanceBetweenPointsM(userPosition, {
      latitude: firstHost.latitude,
      longitude: firstHost.longitude,
    });

    const last = lastAutoDirectionsRef.current;
    if (
      last &&
      last.hostId === firstHost.id &&
      Math.abs(distance - last.distance) <= DIRECTIONS_MOVEMENT_THRESHOLD_M
    ) {
      return;
    }

    lastAutoDirectionsRef.current = {
      hostId: firstHost.id,
      distance,
    };
    setDirectionsHostId(firstHost.id);

    directionsMutation.mutate({
      tourId: tourId!,
      hostId: firstHost.id,
      request: {
        latitude: userPosition.latitude,
        longitude: userPosition.longitude,
      },
    });
  }, [userPosition, hosts, tourId, directionsMutation]);

  function handleLocationBannerPress() {
    if (locationStatus === "denied") {
      void Linking.openSettings();
      return;
    }
    if (locationStatus === "requesting") {
      return;
    }
    void requestPermission();
  }

  function handleGetDirections(host: Host) {
    if (locationStatus === "ready" && userPosition) {
      setDirectionsHostId(host.id);
      directionsMutation.mutate({
        tourId: tourId!,
        hostId: host.id,
        request: {
          latitude: userPosition.latitude,
          longitude: userPosition.longitude,
        },
      });
      return;
    }

    if (
      locationStatus === "idle" ||
      locationStatus === "error" ||
      locationStatus === "timeout"
    ) {
      void requestPermission();
      return;
    }

    if (locationStatus === "denied") {
      void Linking.openSettings();
    }
  }

  if (isCheckingAccess || initializing) {
    return (
      <ThemedView transparent style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (!access || !access.isActive) {
    return (
      <ThemedView transparent style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.padded}>
            <ScreenHeader title="Find Your Host" onBack={() => router.back()} />
            <GlassCard style={styles.messageCard}>
              <Ionicons name="lock-closed" size={28} color={theme.primary} />
              <ThemedText type="smallBold" style={styles.messageTitle}>
                Unlock required
              </ThemedText>
              <ThemedText type="small" style={styles.messageBody}>
                Unlock this tour to find a host on-site.
              </ThemedText>
              <Pressable
                onPress={() => router.back()}
                style={[styles.solidButton, { backgroundColor: theme.primary }]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  Go back
                </ThemedText>
              </Pressable>
            </GlassCard>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (locationStatus === "idle" && !skippedLocation) {
    return (
      <ThemedView transparent style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.padded}>
            <ScreenHeader title="Find Your Host" onBack={() => router.back()} />
          </View>
          <LocationPermissionPrimer
            onEnable={() => void requestPermission()}
            onSkip={() => setSkippedLocation(true)}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isLoadingHosts) {
    return (
      <ThemedView transparent style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.padded}>
            <ScreenHeader title="Find Your Host" onBack={() => router.back()} />
          </View>
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isHostsError) {
    return (
      <ThemedView transparent style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.padded}>
            <ScreenHeader title="Find Your Host" onBack={() => router.back()} />
            <GlassCard style={styles.messageCard}>
              <Ionicons name="cloud-offline-outline" size={28} color={theme.primary} />
              <ThemedText type="smallBold" style={styles.messageTitle}>
                Couldn’t load hosts
              </ThemedText>
              <ThemedText type="small" style={styles.messageBody}>
                Check your connection and that the API server is running, then try
                again.
              </ThemedText>
              <Pressable
                onPress={() => void refetchHosts()}
                style={[styles.solidButton, { backgroundColor: theme.primary }]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  Retry
                </ThemedText>
              </Pressable>
            </GlassCard>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!hosts.length) {
    return (
      <ThemedView transparent style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.padded}>
            <ScreenHeader title="Find Your Host" onBack={() => router.back()} />
            <GlassCard style={styles.messageCard}>
              <Ionicons name="people-outline" size={28} color={theme.primary} />
              <ThemedText type="smallBold" style={styles.messageTitle}>
                No hosts available
              </ThemedText>
              <ThemedText type="small" style={styles.messageBody}>
                No on-site hosts are available for this tour right now.
              </ThemedText>
            </GlassCard>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const showLocationBanner =
    locationStatus === "denied" ||
    locationStatus === "error" ||
    locationStatus === "timeout" ||
    locationStatus === "requesting" ||
    (locationStatus === "idle" && skippedLocation);

  const locationBannerMessage = (() => {
    if (locationStatus === "denied") {
      return "Location permission is off. Tap to open settings.";
    }
    if (locationStatus === "requesting") {
      return "Getting your location…";
    }
    if (locationStatus === "timeout") {
      return "Couldn’t get location. Tap to try again.";
    }
    if (locationStatus === "error") {
      return "Location services are off. Tap to enable them.";
    }
    return "Location disabled — tap to enable";
  })();

  return (
    <ThemedView transparent style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="Find Your Host"
            subtitle={`${hosts.length} host${hosts.length === 1 ? "" : "s"} nearby`}
            onBack={() => router.back()}
          />

          {showLocationBanner ? (
            <Pressable
              onPress={handleLocationBannerPress}
              style={({ pressed }) => [
                styles.locationBanner,
                locationStatus === "requesting" && styles.locationBannerMuted,
                pressed &&
                  locationStatus !== "requesting" &&
                  styles.pressed,
              ]}
            >
              {locationStatus === "requesting" ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons
                  name={
                    locationStatus === "denied" ? "settings-outline" : "location"
                  }
                  size={16}
                  color={theme.primary}
                />
              )}
              <ThemedText type="small" style={styles.locationBannerText}>
                {locationBannerMessage}
              </ThemedText>
            </Pressable>
          ) : null}

          <View style={styles.list}>
            {hosts.map((host) => {
              const distance = userPosition
                ? (distanceBetweenPointsM(userPosition, {
                    latitude: host.latitude,
                    longitude: host.longitude,
                  }) ?? undefined)
                : undefined;

              return (
                <HostCard
                  key={host.id}
                  host={host}
                  distanceM={distance}
                  durationS={
                    directionsMutation.data && directionsHostId === host.id
                      ? directionsMutation.data.durationS
                      : undefined
                  }
                  tourId={tourId}
                  onGetDirections={() => handleGetDirections(host)}
                  isLoadingDirections={
                    directionsMutation.isPending && directionsHostId === host.id
                  }
                />
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  messageCard: {
    alignItems: "center",
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  messageTitle: {
    color: "#ffffff",
    textAlign: "center",
  },
  messageBody: {
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  solidButton: {
    marginTop: Spacing.two,
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    backgroundColor: "rgba(28, 25, 23, 0.62)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(225, 165, 102, 0.4)",
  },
  locationBannerMuted: {
    opacity: 0.85,
  },
  locationBannerText: {
    flex: 1,
    color: "rgba(255,255,255,0.88)",
  },
  list: {
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.86,
  },
});

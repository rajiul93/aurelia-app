import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { lazy, Suspense, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/error-boundary";
import { HostMapFallback } from "@/components/host/host-map-fallback";
import { ScreenHeader } from "@/components/screen-header";
import { useHostDirections } from "@/hooks/mutations/useHostDirections";
import { useHosts } from "@/hooks/queries/useHosts";
import { useHostVisitorLocation } from "@/hooks/useHostVisitorLocation";
import { useTheme } from "@/hooks/use-theme";
import { distanceBetweenPointsM } from "@/lib/distance";

const DIRECTIONS_MOVEMENT_THRESHOLD_M = 25;

const HostMapView = lazy(() =>
  import("@/components/host/host-map-view").then((module) => ({
    default: module.HostMapView,
  })),
);

export default function HostMapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { tourId, hostId } = useLocalSearchParams<{
    tourId: string;
    hostId: string;
  }>();

  const { data: hosts = [] } = useHosts(tourId!);
  const host = hosts.find((h) => h.id === hostId);

  const { status: locationStatus, position: visitorLocation } =
    useHostVisitorLocation({ autoRequest: true });

  const directionsMutation = useHostDirections();
  const lastDirectionsRef = useRef<{
    hostId: string;
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (!tourId || !hostId || !visitorLocation) {
      return;
    }

    const last = lastDirectionsRef.current;
    if (last && last.hostId === hostId) {
      const moved = distanceBetweenPointsM(
        { latitude: last.lat, longitude: last.lng },
        visitorLocation,
      );
      if (moved < DIRECTIONS_MOVEMENT_THRESHOLD_M) {
        return;
      }
    }

    lastDirectionsRef.current = {
      hostId,
      lat: visitorLocation.latitude,
      lng: visitorLocation.longitude,
    };

    directionsMutation.mutate({
      tourId,
      hostId,
      request: {
        latitude: visitorLocation.latitude,
        longitude: visitorLocation.longitude,
      },
    });
  }, [tourId, hostId, visitorLocation, directionsMutation]);

  const distance =
    visitorLocation && host
      ? distanceBetweenPointsM(visitorLocation, {
          latitude: host.latitude,
          longitude: host.longitude,
        })
      : undefined;

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  };

  if (!host) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Loading..." />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]}>
        <ScreenHeader title={host.name} onBack={() => router.back()} />
      </SafeAreaView>

      <View style={styles.mapArea}>
        <ErrorBoundary
          fallback={() => (
            <HostMapFallback host={host} onBack={() => router.back()} />
          )}
        >
          <Suspense
            fallback={
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            }
          >
            <HostMapView
              host={host}
              visitorLocation={visitorLocation}
              directions={directionsMutation.data ?? null}
              isLoading={
                directionsMutation.isPending || locationStatus === "requesting"
              }
            />
          </Suspense>
        </ErrorBoundary>
      </View>

      <View style={styles.bottomPanel}>
        {distance !== undefined ? (
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={16} color={theme.primary} />
              <Text style={styles.metaText}>{formatDistance(distance)} away</Text>
            </View>
            {directionsMutation.data ? (
              <View style={styles.metaItem}>
                <Ionicons name="time" size={16} color={theme.primary} />
                <Text style={styles.metaText}>
                  {formatDuration(directionsMutation.data.durationS)} walk
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() =>
              router.push(`/find-host/${tourId}/${hostId}/directions`)
            }
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate" size={18} color="white" />
            <Text style={styles.primaryButtonText}>Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.secondaryButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color={theme.primary} />
            <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0c0a09",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapArea: {
    flex: 1,
  },
  bottomPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(12, 10, 9, 0.96)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    backgroundColor: "rgba(225, 165, 102, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  secondaryButtonText: {
    fontWeight: "600",
  },
});

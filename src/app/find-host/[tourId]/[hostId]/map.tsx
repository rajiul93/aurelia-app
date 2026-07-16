import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { lazy, Suspense } from "react";
import { useHosts } from "@/hooks/queries/useHosts";
import { useHostVisitorLocation } from "@/hooks/useHostVisitorLocation";
import { useHostDirections } from "@/hooks/mutations/useHostDirections";
import { ScreenHeader } from "@/components/screen-header";
import { HostMapFallback } from "@/components/host/host-map-fallback";
import { ErrorBoundary } from "@/components/error-boundary";
import { distanceBetweenPointsM } from "@/lib/distance";
import { useTheme } from "@/hooks/use-theme";
import type { Host } from "@/types/host";

const HostMapView = lazy(() =>
  import("@/components/host/host-map-view").then((module) => ({
    default: module.HostMapView,
  }))
);

export default function HostMapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { tourId, hostId } = useLocalSearchParams<{
    tourId: string;
    hostId: string;
  }>();

  // Fetch hosts
  const { data: hosts = [] } = useHosts(tourId!);
  const host = hosts.find((h) => h.id === hostId);

  // Get visitor location
  const { status: locationStatus, position: visitorLocation } =
    useHostVisitorLocation({ autoRequest: true });

  // Get directions
  const directionsMutation = useHostDirections();

  // Calculate distance
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
      <View className="flex-1 bg-white dark:bg-gray-950">
        <ScreenHeader title="Loading..." />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <SafeAreaView edges={["top"]}>
        <ScreenHeader
          title={host.name}
          onBack={() => router.back()}
        />
      </SafeAreaView>

      {/* Map */}
      <View className="flex-1">
        <ErrorBoundary fallback={() => <HostMapFallback host={host} onBack={() => router.back()} />}>
          <Suspense fallback={<HostMapFallback host={host} onBack={() => router.back()} />}>
            <HostMapView
              host={host}
              visitorLocation={visitorLocation}
              directions={directionsMutation.data ?? null}
              isLoading={directionsMutation.isPending || locationStatus === "requesting"}
            />
          </Suspense>
        </ErrorBoundary>
      </View>

      {/* Bottom info panel */}
      <View className="border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
        {/* Distance and duration */}
        {distance !== undefined && (
          <View className="mb-4 flex-row items-center justify-between rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-900/20">
            <View className="flex-row items-center gap-2">
              <Ionicons name="location" size={16} color={theme.primary} />
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDistance(distance)} away
              </Text>
            </View>
            {directionsMutation.data && (
              <View className="flex-row items-center gap-2">
                <Ionicons name="time" size={16} color={theme.primary} />
                <Text className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDuration(directionsMutation.data.durationS)} walk
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => router.push(`/find-host/${tourId}/${hostId}/directions`)}
            className="flex-1 flex-row items-center justify-center rounded-lg bg-blue-500 py-3"
            activeOpacity={0.7}
          >
            <Ionicons name="navigate" size={18} color="white" />
            <Text className="ml-2 font-medium text-white">Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-1 flex-row items-center justify-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color={theme.primary} />
            <Text className="ml-2 font-medium" style={{ color: theme.primary }}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

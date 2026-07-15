import { View, ScrollView, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useHosts } from "@/hooks/queries/useHosts";
import { useHostDirections } from "@/hooks/mutations/useHostDirections";
import { useHostVisitorLocation } from "@/hooks/useHostVisitorLocation";
import { HostCard } from "@/components/host/host-card";
import { distanceBetweenPointsM } from "@/lib/distance";
import { ScreenHeader } from "@/components/screen-header";
import { useTourAccess } from "@/hooks/useTourAccess";
import type { Host } from "@/types/host";
import { useRef, useEffect } from "react";

export default function FindHostScreen() {
  const router = useRouter();
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const lastDirectionsCallRef = useRef<{ hostId: string; lat: number; lng: number } | null>(null);

  // Check if user has access to this tour
  const { data: access, isLoading: isCheckingAccess } = useTourAccess(tourId!);

  // Fetch hosts
  const { data: hosts = [], isLoading: isLoadingHosts } = useHosts(tourId!);

  // Get user location
  const { status: locationStatus, position: userPosition } =
    useHostVisitorLocation();

  // Directions mutation
  const directionsMutation = useHostDirections();

  // Debounce directions calls
  useEffect(() => {
    if (!userPosition || !hosts.length) return;

    const MOVEMENT_THRESHOLD = 25; // meters
    const firstHost = hosts[0];

    const distance = distanceBetweenPointsM(userPosition, {
      latitude: firstHost.latitude,
      longitude: firstHost.longitude,
    });

    // Call directions on first fix or if moved >25m
    if (
      !lastDirectionsCallRef.current ||
      Math.abs(distance - (lastDirectionsCallRef.current?.lat || 0)) >
        MOVEMENT_THRESHOLD
    ) {
      lastDirectionsCallRef.current = {
        hostId: firstHost.id,
        lat: userPosition.latitude,
        lng: userPosition.longitude,
      };

      directionsMutation.mutate({
        tourId: tourId!,
        hostId: firstHost.id,
        request: {
          latitude: userPosition.latitude,
          longitude: userPosition.longitude,
        },
      });
    }
  }, [userPosition, hosts, tourId, directionsMutation]);

  // Check access
  if (isCheckingAccess) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!access || !access.isActive) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-950">
        <ScreenHeader title="Find Your Host" />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-lg font-semibold text-gray-900 dark:text-white">
            🔒 Unlock Required
          </Text>
          <Text className="mt-2 text-center text-gray-600 dark:text-gray-400">
            Unlock this tour to find a host on-site
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 rounded-lg bg-blue-500 px-6 py-3"
          >
            <Text className="font-medium text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Request location permission
  if (locationStatus === "pending") {
    return (
      <View className="flex-1 bg-white dark:bg-gray-950">
        <ScreenHeader title="Find Your Host" />
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">
            Requesting location access...
          </Text>
        </View>
      </View>
    );
  }

  if (locationStatus === "denied") {
    return (
      <View className="flex-1 bg-white dark:bg-gray-950">
        <ScreenHeader title="Find Your Host" />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-lg font-semibold text-gray-900 dark:text-white">
            📍 Location Required
          </Text>
          <Text className="mt-2 text-center text-gray-600 dark:text-gray-400">
            Please grant location permission to find a host
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 rounded-lg bg-blue-500 px-6 py-3"
          >
            <Text className="font-medium text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading hosts
  if (isLoadingHosts) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-950">
        <ScreenHeader title="Find Your Host" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  // No hosts available
  if (!hosts.length) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-950">
        <ScreenHeader title="Find Your Host" />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-lg font-semibold text-gray-900 dark:text-white">
            No Hosts Available
          </Text>
          <Text className="mt-2 text-center text-gray-600 dark:text-gray-400">
            No on-site hosts are available for this tour right now.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <ScreenHeader title="Find Your Host" />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {hosts.map((host: Host) => {
          const distance =
            userPosition &&
            distanceBetweenPointsM(userPosition, {
              latitude: host.latitude,
              longitude: host.longitude,
            });

          const directions = directionsMutation.data;

          return (
            <View key={host.id} className="mb-4">
              <HostCard
                host={host}
                distanceM={distance}
                durationS={directions?.durationS}
                tourId={tourId}
                onGetDirections={() => {
                  directionsMutation.mutate({
                    tourId: tourId!,
                    hostId: host.id,
                    request: {
                      latitude: userPosition!.latitude,
                      longitude: userPosition!.longitude,
                    },
                  });
                }}
                isLoadingDirections={directionsMutation.isPending}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

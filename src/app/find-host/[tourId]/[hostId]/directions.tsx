import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useHosts } from "@/hooks/queries/useHosts";
import { useHostVisitorLocation } from "@/hooks/useHostVisitorLocation";
import { useHostDirections } from "@/hooks/mutations/useHostDirections";
import { ScreenHeader } from "@/components/screen-header";
import { distanceBetweenPointsM } from "@/lib/distance";
import { useTheme } from "@/hooks/use-theme";

export default function HostDirectionsScreen() {
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
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleOpenInMaps = () => {
    if (!host || !visitorLocation) return;

    const destination = `${host.latitude},${host.longitude}`;
    const origin = `${visitorLocation.latitude},${visitorLocation.longitude}`;

    // Try Apple Maps first (iOS), then Google Maps
    const appleMapsUrl = `maps://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=w`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;

    Linking.canOpenURL(appleMapsUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(appleMapsUrl);
        } else {
          return Linking.openURL(googleMapsUrl);
        }
      })
      .catch(() => {
        Linking.openURL(googleMapsUrl);
      });
  };

  if (!host) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-950">
        <ScreenHeader title="Directions" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  const directions = directionsMutation.data;

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <SafeAreaView edges={["top"]}>
        <ScreenHeader title={`Directions to ${host.name}`} onBack={() => router.back()} />
      </SafeAreaView>

      {/* Route preview card */}
      <View className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 px-4 py-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Route Ready
            </Text>
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {host.name}
            </Text>
            {host.role && (
              <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {host.role}
              </Text>
            )}
          </View>
          <View className="items-center">
            <Ionicons name="location" size={32} color="#3b82f6" />
          </View>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Summary card */}
        <View className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="location" size={18} color={theme.primary} />
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Distance
              </Text>
            </View>
            {distance !== undefined && (
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {formatDistance(distance)}
              </Text>
            )}
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="time" size={18} color={theme.primary} />
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Walking time
              </Text>
            </View>
            {directions && (
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {formatDuration(directions.durationS)}
              </Text>
            )}
          </View>
        </View>

        {/* Route visualization */}
        {directions && (
          <>
            <Text className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Route Overview
            </Text>

            <View className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <View className="flex-row items-start gap-3">
                <View className="items-center">
                  <View className="h-4 w-4 rounded-full bg-blue-500" />
                  <View
                    className="my-2 w-0.5 bg-gray-300 dark:bg-gray-600"
                    style={{ height: 20 }}
                  />
                  <View className="h-4 w-4 rounded-full bg-red-500" />
                </View>
                <View className="flex-1">
                  <View className="mb-4">
                    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      START
                    </Text>
                    <Text className="text-sm text-gray-700 dark:text-gray-300">
                      Your location
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      DESTINATION
                    </Text>
                    <Text className="text-sm font-medium text-gray-900 dark:text-white">
                      {host.name}
                    </Text>
                    {host.role && (
                      <Text className="text-xs text-gray-600 dark:text-gray-400">
                        {host.role}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Loading state */}
        {directionsMutation.isPending && (
          <View className="mb-6 flex-row items-center gap-2 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <ActivityIndicator size="small" color={theme.primary} />
            <Text className="text-sm text-gray-600 dark:text-gray-300">
              Calculating route...
            </Text>
          </View>
        )}

        {/* Error state */}
        {directionsMutation.isError && (
          <View className="mb-6 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <Text className="text-sm text-red-600 dark:text-red-400">
              Could not calculate directions. Please try again.
            </Text>
          </View>
        )}

        {/* Tip */}
        <View className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
          <View className="mb-2 flex-row items-center gap-2">
            <Ionicons name="bulb" size={16} color="#d97706" />
            <Text className="font-semibold text-amber-900 dark:text-amber-200">
              Tip
            </Text>
          </View>
          <Text className="text-sm text-amber-800 dark:text-amber-300">
            Open in your preferred maps app for turn-by-turn navigation.
          </Text>
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View className="border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={handleOpenInMaps}
            disabled={!visitorLocation}
            className="flex-1 flex-row items-center justify-center rounded-lg py-3"
            style={{
              backgroundColor: visitorLocation ? theme.primary : "#ccc",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate" size={18} color="white" />
            <Text className="ml-2 font-medium text-white">Open in Maps</Text>
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

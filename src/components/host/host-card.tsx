import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { HostStatusChip } from "./host-status-chip";
import type { Host } from "@/types/host";
import { useDeviceLanguage } from "@/hooks/useDeviceLanguage";

interface HostCardProps {
  host: Host;
  distanceM?: number;
  durationS?: number;
  onShowMap?: () => void;
  onGetDirections?: () => void;
  isLoadingDirections?: boolean;
  tourId?: string;
}

export function HostCard({
  host,
  distanceM,
  durationS,
  onShowMap,
  onGetDirections,
  isLoadingDirections,
  tourId,
}: HostCardProps) {
  const router = useRouter();
  const language = useDeviceLanguage();
  const bio = host.translations.find((t) => t.language === language)?.bio || "";

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min${minutes > 1 ? "s" : ""} walk`;
  };

  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Photo */}
      {host.photoUrl && (
        <Image
          source={{ uri: host.photoUrl }}
          className="mb-4 h-48 w-full rounded-lg bg-gray-200"
          resizeMode="cover"
        />
      )}

      {/* Name and Role */}
      <Text className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
        {host.name}
      </Text>
      {host.role && (
        <Text className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          {host.role}
        </Text>
      )}

      {/* Status Chip */}
      <View className="mb-3">
        <HostStatusChip host={host} />
      </View>

      {/* Distance and Duration */}
      {distanceM !== undefined && (
        <View className="mb-3 flex-row gap-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="location" size={16} color="#666" />
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {formatDistance(distanceM)}
            </Text>
          </View>
          {durationS !== undefined && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="time" size={16} color="#666" />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {formatDuration(durationS)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Bio */}
      {bio && (
        <Text className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {bio}
        </Text>
      )}

      {/* Action Buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={
            onShowMap || (tourId ? () => router.push(`/find-host/${tourId}/${host.id}/map`) : undefined)
          }
          className="flex-1 rounded-lg bg-blue-500 py-3"
          activeOpacity={0.7}
        >
          <Text className="text-center font-medium text-white">Show on Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onGetDirections}
          disabled={isLoadingDirections}
          className="flex-1 flex-row items-center justify-center rounded-lg border border-blue-500 py-3"
          activeOpacity={0.7}
        >
          {isLoadingDirections ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Text className="font-medium text-blue-500">Directions</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

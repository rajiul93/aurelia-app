import { View, Text } from "react-native";
import { useDeviceLanguage } from "@/hooks/useDeviceLanguage";
import type { Host } from "@/types/host";

interface HostStatusChipProps {
  host: Host;
}

function isWithinHours(
  availableFrom: string | null,
  availableTo: string | null
): boolean {
  if (!availableFrom || !availableTo) return true; // No hours set = always available (if isActive)

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  return currentTime >= availableFrom && currentTime < availableTo;
}

export function HostStatusChip({ host }: HostStatusChipProps) {
  const isAvailable = host.isActive && isWithinHours(host.availableFrom, host.availableTo);

  if (!isAvailable) {
    return (
      <View className="flex-row items-center gap-2 rounded-full bg-red-100 px-3 py-1">
        <View className="h-2 w-2 rounded-full bg-red-600" />
        <Text className="text-sm font-medium text-red-600">Offline</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-2 rounded-full bg-green-100 px-3 py-1">
      <View className="h-2 w-2 rounded-full bg-green-600" />
      <Text className="text-sm font-medium text-green-600">Available now</Text>
      {host.availableTo && (
        <Text className="text-xs text-green-600">
          (until {host.availableTo})
        </Text>
      )}
    </View>
  );
}

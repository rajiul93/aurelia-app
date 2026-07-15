import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useTheme } from "@/hooks/use-theme";
import type { Host } from "@/types/host";

interface HostMapFallbackProps {
  host: Host;
  onBack?: () => void;
}

export function HostMapFallback({ host, onBack }: HostMapFallbackProps) {
  const theme = useTheme();

  return (
    <View className="flex-1 bg-white dark:bg-gray-950 items-center justify-center px-6">
      <View className="items-center gap-6 max-w-xs">
        {/* Icon */}
        <View
          className="w-20 h-20 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.primary + "20" }}
        >
          <Ionicons name="map" size={40} color={theme.primary} />
        </View>

        {/* Heading */}
        <View className="gap-2 items-center">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
            Map Feature
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
            ডেভ বিল্ড প্রয়োজন
          </Text>
        </View>

        {/* Message */}
        <Text className="text-center text-gray-700 dark:text-gray-300 text-sm leading-6">
          লাইভ ম্যাপ এবং রুট ভিউ Expo Go-তে কাজ করে না। একটি ডেভেলপমেন্ট বিল্ড তৈরি করুন।
        </Text>

        {/* Info Box */}
        <View className="w-full bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 gap-3">
          <View className="gap-2">
            <Text className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase">
              কমান্ড চালান
            </Text>
            <View className="bg-gray-900 rounded px-3 py-2 gap-2">
              <Text className="text-xs font-mono text-gray-300">
                eas build --platform ios --profile preview
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase">
              অথবা
            </Text>
            <View className="bg-gray-900 rounded px-3 py-2">
              <Text className="text-xs font-mono text-gray-300">
                eas build --platform android --profile preview
              </Text>
            </View>
          </View>
        </View>

        {/* Features Available */}
        <View className="w-full gap-2">
          <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
            এখন উপলব্ধ
          </Text>
          <View className="gap-2">
            <View className="flex-row items-center gap-3">
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                হোস্ট তালিকা এবং দূরত্ব
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                নির্দেশনা স্ক্রিন
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                Apple Maps / Google Maps ইন্টিগ্রেশন
              </Text>
            </View>
          </View>
        </View>

        {/* Back Button */}
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            className="w-full mt-4 rounded-lg py-3 flex-row items-center justify-center gap-2"
            style={{ backgroundColor: theme.primary }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="white" />
            <Text className="font-semibold text-white">ফিরে যান</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

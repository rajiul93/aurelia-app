import React, { ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useTheme } from "@/hooks/use-theme";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("Error caught by boundary:", error);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      // Default fallback
      const isMapLibreError =
        this.state.error.message.includes("MLRNCameraModule") ||
        this.state.error.message.includes("MapLibre") ||
        this.state.error.message.includes("maplibre");

      if (isMapLibreError) {
        return <MapLibreErrorScreen />;
      }

      return (
        <View className="flex-1 bg-white dark:bg-gray-950 items-center justify-center px-6">
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text className="mt-4 text-lg font-bold text-gray-900 dark:text-white text-center">
            Something went wrong
          </Text>
          <Text className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
            {this.state.error.message}
          </Text>
          <TouchableOpacity
            onPress={this.retry}
            className="mt-6 rounded-lg bg-blue-500 px-6 py-3"
            activeOpacity={0.7}
          >
            <Text className="font-semibold text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

function MapLibreErrorScreen() {
  const theme = useTheme();

  return (
    <View className="flex-1 bg-white dark:bg-gray-950 items-center justify-center px-6">
      <View className="items-center gap-6 max-w-xs">
        <View
          className="w-20 h-20 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.primary + "20" }}
        >
          <Ionicons name="map" size={40} color={theme.primary} />
        </View>

        <View className="gap-2 items-center">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
            Map Feature
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
            ডেভ বিল্ড প্রয়োজন
          </Text>
        </View>

        <Text className="text-center text-gray-700 dark:text-gray-300 text-sm leading-6">
          লাইভ ম্যাপ এবং রুট ভিউ Expo Go-তে কাজ করে না। একটি ডেভেলপমেন্ট বিল্ড তৈরি করুন।
        </Text>

        <View className="w-full bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 gap-3">
          <View className="gap-2">
            <Text className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase">
              কমান্ড চালান
            </Text>
            <View className="bg-gray-900 rounded px-3 py-2">
              <Text className="text-xs font-mono text-gray-300 leading-5">
                eas build --platform{"\n"}ios --profile preview
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase">
              অথবা
            </Text>
            <View className="bg-gray-900 rounded px-3 py-2">
              <Text className="text-xs font-mono text-gray-300 leading-5">
                eas build --platform{"\n"}android --profile preview
              </Text>
            </View>
          </View>
        </View>

        <View className="w-full gap-2">
          <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
            এখন উপলব্ধ ✓
          </Text>
          <View className="gap-2">
            <View className="flex-row items-center gap-3">
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                হোস্ট লিস্ট এবং দূরত্ব
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
                Maps ইন্টিগ্রেশন
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function TourLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        freezeOnBlur: true,
        animation: Platform.OS === "android" ? "simple_push" : "default",
        animationDuration: 250,
      }}
    />
  );
}

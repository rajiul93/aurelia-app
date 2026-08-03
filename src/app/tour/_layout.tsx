import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function TourLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        freezeOnBlur: true,
        // Screens are transparent over one shared photo background, so a slide
        // drags *both* screens' content visibly across it — which reads as the
        // page shaking. A cross-dissolve is the only transition that stays clean
        // with transparent scenes. iOS keeps its native push.
        animation: Platform.OS === "android" ? "fade" : "default",
        animationDuration: Platform.OS === "android" ? 200 : 250,
      }}
    />
  );
}

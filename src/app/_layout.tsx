import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";
import { enableFreeze } from "react-native-screens";

import { AnimatedSplash } from "@/components/animated-splash";
import { AppBackground } from "@/components/app-background";
import { TourReminderGate } from "@/components/tour-reminder/tour-reminder-gate";
import { TourReminderListener } from "@/components/tour-reminder/tour-reminder-listener";
import { useAppBootstrap } from "@/hooks/use-app-bootstrap";
import { useColorScheme } from "@/hooks/use-color-scheme";

import "@/global.css";
import { AppProviders } from "@/providers/app-providers";
import { BrandColors } from "@/theme/colors";

const SPLASH_BACKGROUND = "#0c0a09";

// Pause inactive screens so Home (floor cards, sheens) doesn't keep burning JS
// while another route is pushing/popping — the main source of transition lag.
enableFreeze(true);

// Hold the native splash until the JS overlay has painted (handled inside
// AnimatedSplash), so cold start never shows a blank frame.
SplashScreen.preventAutoHideAsync();

const AureliaDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: BrandColors.primary,
  },
};

const AureliaLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: BrandColors.primary,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const ready = useAppBootstrap();

  return (
    <View style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }}>
      {ready ? (
        <AppProviders>
          <ThemeProvider
            value={colorScheme === "dark" ? AureliaDarkTheme : AureliaLightTheme}
          >
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <AppBackground>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "transparent" },
                  freezeOnBlur: true,
                  // Android default stack animation is heavy with transparent
                  // scenes + photo background; simple_push stays snappy.
                  animation:
                    Platform.OS === "android" ? "simple_push" : "default",
                  animationDuration: 250,
                }}
              >
                <Stack.Screen name="welcome" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="download/[tourId]"
                  options={{
                    animation: "fade",
                    animationDuration: 180,
                  }}
                />
                <Stack.Screen name="tour" />
                <Stack.Screen name="pages/[key]" />
                <Stack.Screen name="faq" />
                <Stack.Screen name="subscribe" />
              </Stack>
              <TourReminderListener />
              <TourReminderGate />
            </AppBackground>
          </ThemeProvider>
        </AppProviders>
      ) : null}

      <AnimatedSplash ready={ready} />
    </View>
  );
}

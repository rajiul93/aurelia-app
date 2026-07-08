import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

import { AnimatedSplash } from "@/components/animated-splash";
import { useAppBootstrap } from "@/hooks/use-app-bootstrap";
import { useColorScheme } from "@/hooks/use-color-scheme";

import "@/global.css";
import { AppProviders } from "@/providers/app-providers";
import { BrandColors } from "@/theme/colors";

const SPLASH_BACKGROUND = "#0c0a09";

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
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="welcome" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="tour" />
              <Stack.Screen name="pages/[key]" />
              <Stack.Screen name="faq" />
              <Stack.Screen name="subscribe" />
            </Stack>
          </ThemeProvider>
        </AppProviders>
      ) : null}

      <AnimatedSplash ready={ready} />
    </View>
  );
}

import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  useFonts,
} from "@expo-google-fonts/roboto";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import "@/global.css";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AppProviders } from "@/providers/app-providers";
import { BrandColors } from "@/theme/colors";

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
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppProviders>
      <ThemeProvider
        value={colorScheme === "dark" ? AureliaDarkTheme : AureliaLightTheme}
      >
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="tour" />
          <Stack.Screen name="pages" />
          <Stack.Screen name="subscribe" />
        </Stack>
      </ThemeProvider>
    </AppProviders>
  );
}

import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import { useThemeStore } from "@/store/theme-store";

/**
 * Effective color scheme on web. Mirrors the native hook (Theme preference
 * overrides System) while keeping the hydration guard for static rendering.
 */
export function useColorScheme(): "light" | "dark" {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const mode = useThemeStore((state) => state.mode);
  const systemScheme = useRNColorScheme();

  if (!hasHydrated) {
    return "light";
  }

  if (mode === "light" || mode === "dark") {
    return mode;
  }

  return systemScheme === "dark" ? "dark" : "light";
}

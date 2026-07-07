import { useColorScheme as useRNColorScheme } from "react-native";

import { useThemeStore } from "@/store/theme-store";

/**
 * Effective color scheme for the whole app: the user's saved Theme preference
 * when set to Light or Dark, otherwise the device (System) scheme.
 */
export function useColorScheme(): "light" | "dark" {
  const mode = useThemeStore((state) => state.mode);
  const systemScheme = useRNColorScheme();

  if (mode === "light" || mode === "dark") {
    return mode;
  }

  return systemScheme === "dark" ? "dark" : "light";
}

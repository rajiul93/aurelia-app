import { useColorScheme as useRNColorScheme } from "react-native";

import { useRemoteConfig } from "@/store/release-config-store";

/**
 * Effective color scheme for the whole app.
 *
 * Admin-controlled, not user-controlled: appearance is a venue-wide branding
 * decision set from the admin dashboard, so there is no theme switch in
 * Settings. "system" defers to the device.
 *
 * Reads the release-config store, which hydrates from
 * `Paths.document/aurelia/release-config.json` at bootstrap and falls back to a
 * compiled-in default — so the theme is available on a cold start with no
 * network, and stops depending on the API once it has synced once.
 */
export function useColorScheme(): "light" | "dark" {
  const { appTheme } = useRemoteConfig();
  const systemScheme = useRNColorScheme();

  if (appTheme === "light" || appTheme === "dark") {
    return appTheme;
  }

  return systemScheme === "dark" ? "dark" : "light";
}

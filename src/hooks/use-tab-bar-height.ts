import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";

/** Height of the floating glass tab bar surface (excludes the safe-area inset). */
export const TAB_BAR_BASE_HEIGHT = 62;

/**
 * Total vertical space the floating tab bar occupies from the bottom of the
 * screen, including the bottom safe-area inset. Screens use this to keep
 * scroll content and pinned inputs clear of the bar.
 */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, Spacing.two);
}

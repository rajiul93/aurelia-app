import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Frosted glass panel for use over the global photo background.
 * Mirrors the tab-bar approach: Liquid Glass / iOS BlurView when available,
 * translucent tint on Android (no blur target for floating cards).
 */
export function GlassCard({ children, style }: GlassCardProps) {
  const theme = useTheme();
  const scheme = useColorScheme() ?? "light";
  const liquidGlass = isLiquidGlassAvailable();

  const surfaceStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: liquidGlass
        ? "transparent"
        : withAlpha(
            theme.backgroundElement,
            Platform.OS === "android" ? 0.72 : 0.22,
          ),
      borderColor: withAlpha(theme.text, 0.14),
    },
    style,
  ];

  if (liquidGlass) {
    return (
      <GlassView style={surfaceStyle} glassEffectStyle="regular">
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === "android") {
    return <View style={surfaceStyle}>{children}</View>;
  }

  return (
    <BlurView
      tint={
        scheme === "dark"
          ? "systemChromeMaterialDark"
          : "systemChromeMaterialLight"
      }
      intensity={55}
      style={surfaceStyle}
    >
      {children}
    </BlurView>
  );
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
    overflow: "hidden",
  },
});

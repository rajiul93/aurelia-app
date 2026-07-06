import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { GoldGradientHorizontal } from "@/theme/gradients";

type ProgressBarProps = {
  value: number;
  variant?: "default" | "gold";
  trackColor?: string;
};

export function ProgressBar({
  value,
  variant = "default",
  trackColor,
}: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor:
            trackColor ??
            (variant === "gold" ? "rgba(255,255,255,0.1)" : theme.backgroundSelected),
        },
      ]}
    >
      {variant === "gold" ? (
        <LinearGradient
          {...GoldGradientHorizontal}
          style={[styles.fill, { width: `${clamped}%` }]}
        />
      ) : (
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: theme.primary,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});

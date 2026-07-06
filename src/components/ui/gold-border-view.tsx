import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { Spacing } from "@/constants/theme";
import { GoldGradientHorizontal } from "@/theme/gradients";

type GoldBorderViewProps = {
  children: ReactNode;
  borderRadius?: number;
  borderWidth?: number;
  innerBackground?: string;
  style?: ViewStyle;
};

export function GoldBorderView({
  children,
  borderRadius = Spacing.three,
  borderWidth = 1,
  innerBackground = "#1c1917",
  style,
}: GoldBorderViewProps) {
  return (
    <LinearGradient
      {...GoldGradientHorizontal}
      style={[styles.outer, { borderRadius, padding: borderWidth }, style]}
    >
      <View
        style={[
          styles.inner,
          {
            borderRadius: Math.max(0, borderRadius - borderWidth),
            backgroundColor: innerBackground,
          },
        ]}
      >
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: "stretch",
  },
  inner: {
    overflow: "hidden",
  },
});

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { GoldGradientHorizontal } from "@/theme/gradients";

type IconName = ComponentProps<typeof Ionicons>["name"];

type GoldGradientButtonProps = {
  label: string;
  onPress: () => void;
  /** Leading icon shown before the label. */
  icon?: IconName;
  showArrow?: boolean;
  style?: ViewStyle;
};

export function GoldGradientButton({
  label,
  onPress,
  icon,
  showArrow = false,
  style,
}: GoldGradientButtonProps) {
  return (
    <Pressable onPress={onPress} style={style}>
      <LinearGradient {...GoldGradientHorizontal} style={styles.gradient}>
        {icon ? <Ionicons name={icon} size={16} color="#1a1208" /> : null}
        <ThemedText type="smallBold" style={styles.label}>
          {label}
        </ThemedText>
        {showArrow ? (
          <Ionicons name="arrow-forward" size={16} color="#1a1208" />
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    minWidth: 88,
    minHeight: 40,
    borderRadius: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  label: {
    color: "#1a1208",
  },
});

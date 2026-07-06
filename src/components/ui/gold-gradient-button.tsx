import { Ionicons } from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { GoldGradientHorizontal } from "@/theme/gradients";

type GoldGradientButtonProps = {
  label: string;
  onPress: () => void;
  showArrow?: boolean;
  style?: ViewStyle;
};

export function GoldGradientButton({
  label,
  onPress,
  showArrow = false,
  style,
}: GoldGradientButtonProps) {
  return (
    <Pressable onPress={onPress} style={style}>
      <LinearGradient
        {...GoldGradientHorizontal}
        style={styles.gradient}
      >
        <ThemedText type="smallBold" style={styles.label}>
          {label}
        </ThemedText>
        {showArrow ? (
          <View style={styles.arrow}>
            <Ionicons name="arrow-forward" size={16} color="#1a1208" />
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    minWidth: 88,
    height: 40,
    borderRadius: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
  },
  label: {
    color: "#1a1208",
  },
  arrow: {
    position: "absolute",
    right: Spacing.three,
  },
});

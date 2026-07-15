import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type FloorCardProps = {
  name: string;
  coverUrl?: string | null;
  stopCount: number;
  stopLabel: string;
  exploreLabel: string;
  /** Stagger delay for the entrance animation, in ms. */
  delay?: number;
  onPress: () => void;
};

/**
 * A premium, tappable card for one floor: cover image, name, stop count and an
 * explicit "explore" affordance so it reads as openable. Soft shadow, rounded
 * corners, and a gentle press-in scale.
 */
export function FloorCard({
  name,
  coverUrl,
  stopCount,
  stopLabel,
  exploreLabel,
  delay = 0,
  onPress,
}: FloorCardProps) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(420).springify().damping(18)}
      style={styles.shadow}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.coverWrap}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.cover}
              contentFit="cover"
              transition={220}
            />
          ) : (
            <View
              style={[
                styles.cover,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />
          )}

          {/* Bottom scrim so the name/indicator stays legible over any image. */}
          <LinearGradient
            colors={["transparent", "rgba(12, 10, 9, 0.72)"]}
            style={styles.scrim}
          />

          <View style={styles.overlay}>
            <View style={styles.textBlock}>
              <ThemedText
                type="subtitle"
                numberOfLines={1}
                style={styles.name}
              >
                {name}
              </ThemedText>
              <ThemedText type="small" style={styles.stops}>
                {stopCount} {stopLabel}
              </ThemedText>
            </View>

            <View
              style={[styles.exploreChip, { backgroundColor: theme.primary }]}
            >
              <Ionicons
                name="compass"
                size={16}
                color={theme.primaryForeground}
              />
              <ThemedText
                type="smallBold"
                style={{ color: theme.primaryForeground }}
              >
                {exploreLabel}
              </ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    alignSelf: "stretch",
    borderRadius: Spacing.four,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.four,
    overflow: "hidden",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.96,
  },
  coverWrap: {
    width: "100%",
    height: 170,
    justifyContent: "flex-end",
  },
  cover: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  scrim: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  textBlock: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  name: {
    color: "#ffffff",
    fontSize: 22,
    lineHeight: 27,
  },
  stops: {
    color: "rgba(255, 255, 255, 0.86)",
  },
  exploreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});

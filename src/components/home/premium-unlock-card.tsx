import { Ionicons } from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { GoldGradientColors, GoldGradientHorizontal } from "@/theme/gradients";

const CARD_HEIGHT = 78;
const CARD_RADIUS = 18;
const SHEEN_WIDTH = 72;
const SHEEN_CYCLE_MS = 4200;
const GOLD = "#e1a566";

type PremiumUnlockCardProps = {
  onPress: () => void;
};

/**
 * Compact signed-out unlock banner — deep gold-washed tile with a soft
 * sweeping light, matching the Find Host / Reminders premium language.
 */
export function PremiumUnlockCard({ onPress }: PremiumUnlockCardProps) {
  const { t } = useStrings();
  const isFocused = useIsFocused();
  const progress = useSharedValue(0);
  const cardWidth = useSharedValue(320);

  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(progress);
      return;
    }

    progress.value = withRepeat(
      withTiming(1, { duration: SHEEN_CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [isFocused, progress]);

  const sheenStyle = useAnimatedStyle(() => {
    const travel = cardWidth.value + SHEEN_WIDTH * 2;
    return {
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, 1],
            [-SHEEN_WIDTH, travel],
          ),
        },
        { rotate: "16deg" },
      ],
    };
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(40).duration(260)}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t("home.premiumTitle")}
        accessibilityHint={t("home.signInCta")}
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={styles.card}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.width;
            if (next > 0) {
              cardWidth.value = next;
            }
          }}
        >
          {/* Ambient gold wash — single surface, no nested card. */}
          <LinearGradient
            colors={["#2a2118", "#16120f", "#0f0d0b"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Soft top gold rim */}
          <LinearGradient
            colors={["rgba(225,165,102,0.35)", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.topRim}
            pointerEvents="none"
          />

          {/* Moving light — pause when this screen is not focused */}
          {isFocused ? (
            <View pointerEvents="none" style={styles.sheenLayer}>
              <Animated.View style={[styles.sheenBand, sheenStyle]}>
                <LinearGradient
                  colors={[
                    "transparent",
                    "rgba(236,201,138,0.18)",
                    "rgba(255,255,255,0.34)",
                    "rgba(236,201,138,0.18)",
                    "transparent",
                  ]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.sheenGradient}
                />
              </Animated.View>
            </View>
          ) : null}

          <View style={styles.content}>
            <View style={styles.iconRing}>
              <LinearGradient
                {...GoldGradientHorizontal}
                style={styles.iconBadge}
              >
                <Ionicons name="diamond" size={15} color="#1a1208" />
              </LinearGradient>
            </View>

            <View style={styles.copy}>
              <ThemedText
                type="smallBold"
                numberOfLines={1}
                style={styles.title}
              >
                {t("home.premiumTitle")}
              </ThemedText>
              <ThemedText type="small" numberOfLines={1} style={styles.subtitle}>
                {t("home.premiumSubtitle")}
              </ThemedText>
            </View>

            <LinearGradient
              colors={[...GoldGradientColors]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.cta}
            >
              <ThemedText type="smallBold" style={styles.ctaLabel}>
                {t("home.premiumCta")}
              </ThemedText>
              <Ionicons name="arrow-forward" size={13} color="#1a1208" />
            </LinearGradient>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "stretch",
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(225, 165, 102, 0.42)",
  },
  topRim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 22,
  },
  sheenLayer: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  sheenBand: {
    position: "absolute",
    top: -30,
    bottom: -30,
    width: SHEEN_WIDTH,
  },
  sheenGradient: {
    flex: 1,
    width: SHEEN_WIDTH,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  iconRing: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(225, 165, 102, 0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(225, 165, 102, 0.38)",
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  title: {
    color: "#faf7f2",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 14,
    color: "rgba(225, 165, 102, 0.78)",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  ctaLabel: {
    color: "#1a1208",
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
});

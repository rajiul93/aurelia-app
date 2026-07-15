import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const CARD_RADIUS = 28;
const CARD_HEIGHT = 170;

type FloorCardSkeletonProps = {
  /** How many placeholder cards to render. */
  count?: number;
};

function SkeletonBone({
  style,
  pulse,
}: {
  style: object;
  pulse: SharedValue<number>;
}) {
  const theme = useTheme();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.38, 0.72]),
  }));

  return (
    <Animated.View
      style={[
        styles.bone,
        { backgroundColor: theme.backgroundSelected },
        style,
        animatedStyle,
      ]}
    />
  );
}

function FloorCardSkeletonItem({
  pulse,
  delayMs,
}: {
  pulse: SharedValue<number>;
  delayMs: number;
}) {
  const theme = useTheme();
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      {
        translateY: interpolate(enter.value, [0, 1], [10 + delayMs * 0.02, 0]),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.shadow, wrapStyle]}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        <View style={styles.coverWrap}>
          <SkeletonBone style={StyleSheet.absoluteFill} pulse={pulse} />

          <View style={styles.badgeSlot}>
            <SkeletonBone style={styles.badge} pulse={pulse} />
          </View>

          <View style={styles.overlay}>
            <View style={styles.textBlock}>
              <SkeletonBone style={styles.title} pulse={pulse} />
              <SkeletonBone style={styles.subtitle} pulse={pulse} />
            </View>
            <SkeletonBone style={styles.chip} pulse={pulse} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Floor-card shaped loading placeholders for Home while the catalog resolves.
 */
export function FloorCardSkeleton({ count = 3 }: FloorCardSkeletonProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <FloorCardSkeletonItem
          key={index}
          pulse={pulse}
          delayMs={index * 80}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    alignSelf: "stretch",
    gap: Spacing.four,
  },
  shadow: {
    alignSelf: "stretch",
    borderRadius: CARD_RADIUS,
    backgroundColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  card: {
    alignSelf: "stretch",
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
  },
  coverWrap: {
    width: "100%",
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  bone: {
    borderRadius: Spacing.two,
  },
  badgeSlot: {
    position: "absolute",
    top: Spacing.three,
    right: Spacing.three,
  },
  badge: {
    width: 118,
    height: 24,
    borderRadius: 999,
  },
  overlay: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.two,
  },
  title: {
    width: "58%",
    height: 22,
    borderRadius: Spacing.two,
  },
  subtitle: {
    width: "36%",
    height: 14,
    borderRadius: Spacing.one,
  },
  chip: {
    width: 88,
    height: 32,
    borderRadius: 999,
  },
});

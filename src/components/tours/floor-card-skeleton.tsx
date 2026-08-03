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
  /**
   * Cover height of the card being stood in for. Must match the real card or
   * the list resizes the moment data lands: Home renders `TourCard` (250) while
   * the default here is `FloorCard` (170), which shifted the page by 240px
   * across three cards.
   */
  cardHeight?: number;
  /** Corner radius of the card being stood in for (FloorCard 28, TourCard 20). */
  radius?: number;
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
  cardHeight,
  radius,
}: {
  pulse: SharedValue<number>;
  delayMs: number;
  cardHeight: number;
  radius: number;
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
    <Animated.View
      style={[styles.shadow, { borderRadius: radius }, wrapStyle]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderRadius: radius },
        ]}
      >
        <View
          style={[styles.coverWrap, { height: cardHeight, borderRadius: radius }]}
        >
          <SkeletonBone style={StyleSheet.absoluteFill} pulse={pulse} />

          <View style={styles.badgeSlot}>
            <SkeletonBone style={styles.badge} pulse={pulse} />
            <SkeletonBone style={styles.chip} pulse={pulse} />
          </View>

          <View style={styles.overlay}>
            <View style={styles.textBlock}>
              <SkeletonBone style={styles.title} pulse={pulse} />
              <SkeletonBone style={styles.subtitle} pulse={pulse} />
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Floor-card shaped loading placeholders for Home while the catalog resolves.
 */
export function FloorCardSkeleton({
  count = 3,
  cardHeight = CARD_HEIGHT,
  radius = CARD_RADIUS,
}: FloorCardSkeletonProps) {
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
          cardHeight={cardHeight}
          radius={radius}
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
    alignItems: "flex-end",
    gap: Spacing.two,
  },
  badge: {
    width: 118,
    height: 24,
    borderRadius: 999,
  },
  overlay: {
    padding: Spacing.four,
  },
  textBlock: {
    width: "100%",
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

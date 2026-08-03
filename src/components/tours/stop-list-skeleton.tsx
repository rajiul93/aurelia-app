import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * Placeholder rows shaped like `StopListCard`, so the floor screen's loading
 * state occupies the same height as its loaded state. A shorter placeholder
 * meant the list grew the moment content arrived — mid-transition, which reads
 * as the page jumping.
 */
type StopListSkeletonProps = {
  count?: number;
};

function Bone({
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
        { backgroundColor: theme.backgroundSelected, borderRadius: 6 },
        style,
        animatedStyle,
      ]}
    />
  );
}

export function StopListSkeleton({ count = 5 }: StopListSkeletonProps) {
  const theme = useTheme();
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
        <View
          key={index}
          style={[styles.card, { backgroundColor: theme.backgroundElement }]}
        >
          <Bone style={styles.stopNumber} pulse={pulse} />
          <View style={styles.text}>
            <Bone style={styles.title} pulse={pulse} />
            <Bone style={styles.subtitle} pulse={pulse} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    alignSelf: "stretch",
    gap: Spacing.two,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
  title: {
    height: 14,
    width: "62%",
  },
  subtitle: {
    height: 12,
    width: "84%",
  },
});

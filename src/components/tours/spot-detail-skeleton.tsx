import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";

function Bone({
  style,
  pulse,
}: {
  style: object;
  pulse: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.28, 0.58]),
  }));

  return (
    <Animated.View style={[styles.bone, style, animatedStyle]} />
  );
}

/**
 * Spot-detail shaped loading skeleton — mirrors title, audio, transcript,
 * gallery and footer so the handoff feels native when content resolves.
 */
export function SpotDetailSkeleton() {
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Bone style={styles.iconBtn} pulse={pulse} />
          <Bone style={styles.stopPill} pulse={pulse} />
          <Bone style={styles.iconBtn} pulse={pulse} />
        </View>

        <View style={styles.body}>
          <Bone style={styles.title} pulse={pulse} />
          <Bone style={styles.gallery} pulse={pulse} />
          <Bone style={styles.audio} pulse={pulse} />

          <View style={styles.panel}>
            <Bone style={styles.panelLabel} pulse={pulse} />
            <Bone style={styles.lineFull} pulse={pulse} />
            <Bone style={styles.lineFull} pulse={pulse} />
            <Bone style={styles.lineMid} pulse={pulse} />
          </View>

          <View style={styles.panel}>
            <Bone style={styles.panelLabel} pulse={pulse} />
            <Bone style={styles.faqRow} pulse={pulse} />
            <Bone style={styles.faqRow} pulse={pulse} />
          </View>
        </View>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <Bone style={styles.footerSide} pulse={pulse} />
          <Bone style={styles.footerMid} pulse={pulse} />
          <Bone style={styles.footerCta} pulse={pulse} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  bone: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: Spacing.two,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  stopPill: {
    width: 88,
    height: 22,
    borderRadius: 999,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    width: "78%",
    height: 28,
    borderRadius: Spacing.two,
  },
  audio: {
    width: "100%",
    height: 72,
    borderRadius: Spacing.three,
    marginTop: Spacing.one,
  },
  panel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: "rgba(28, 25, 23, 0.42)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  panelLabel: {
    width: "34%",
    height: 14,
    borderRadius: Spacing.one,
  },
  lineFull: {
    width: "100%",
    height: 12,
    borderRadius: Spacing.one,
  },
  lineMid: {
    width: "68%",
    height: 12,
    borderRadius: Spacing.one,
  },
  gallery: {
    width: "100%",
    height: 180,
    borderRadius: Spacing.three,
  },
  faqRow: {
    width: "100%",
    height: 40,
    borderRadius: Spacing.two,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  footerSide: {
    width: 64,
    height: 18,
    borderRadius: Spacing.one,
  },
  footerMid: {
    width: 96,
    height: 18,
    borderRadius: Spacing.one,
  },
  footerCta: {
    width: 92,
    height: 36,
    borderRadius: Spacing.two,
  },
});

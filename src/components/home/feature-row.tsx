import { Ionicons } from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { SetTourDateModal } from "@/components/tour-reminder/set-tour-date-modal";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { setUserVisitDate } from "@/lib/tour-reminder/sync";
import { useEntitlementsStore } from "@/store/entitlements-store";
import { useTourReminderStore } from "@/store/tour-reminder-store";
import { GoldGradientHorizontal } from "@/theme/gradients";

const TILE_HEIGHT = 140;
const TILE_RADIUS = 22;
const SHEEN_WIDTH = 56;
const SHEEN_CYCLE_MS = 3800;
const GOLD = "#e1a566";

/** Default until onLayout — animation starts immediately either way. */
const DEFAULT_TILE_WIDTH = 168;

/**
 * Soft gold glint behind content. Single band — no nested surface layers.
 */
function MovingLightSheen({
  tileWidth,
  delayMs = 0,
}: {
  tileWidth: SharedValue<number>;
  delayMs?: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, { duration: SHEEN_CYCLE_MS, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, [delayMs, progress]);

  const bandStyle = useAnimatedStyle(() => {
    const w = Math.max(tileWidth.value, DEFAULT_TILE_WIDTH);
    const travel = w + SHEEN_WIDTH * 2;
    return {
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, 1],
            [-SHEEN_WIDTH, travel],
          ),
        },
        { rotate: "14deg" },
      ],
    };
  });

  return (
    <View pointerEvents="none" style={styles.sheenLayer}>
      <Animated.View style={[styles.sheenBand, bandStyle]}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(236,201,138,0.14)",
            "rgba(255,255,255,0.26)",
            "rgba(236,201,138,0.14)",
            "transparent",
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.sheenGradient}
        />
      </Animated.View>
    </View>
  );
}

type FeatureTileProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  locked: boolean;
  lockedLabel: string;
  onPress: () => void;
  delay?: number;
  sheenDelayMs?: number;
};

function FeatureTile({
  icon,
  title,
  subtitle,
  locked,
  lockedLabel,
  onPress,
  delay = 0,
  sheenDelayMs = 0,
}: FeatureTileProps) {
  const tileWidth = useSharedValue(DEFAULT_TILE_WIDTH);

  return (
    <Animated.View
      style={styles.tileWrap}
      entering={FadeInDown.delay(delay).duration(420).springify().damping(18)}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityHint={locked ? lockedLabel : title}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        {/* One surface only — gold-washed fill, no nested card. */}
        <View
          style={styles.tile}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.width;
            if (next > 0) {
              tileWidth.value = next;
            }
          }}
        >
          <LinearGradient
            colors={["#2a2118", "#16120f", "#0f0d0b"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <LinearGradient
            colors={["rgba(225,165,102,0.28)", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.topRim}
            pointerEvents="none"
          />

          <MovingLightSheen tileWidth={tileWidth} delayMs={sheenDelayMs} />

          <View style={styles.tileContent}>
            <View style={styles.tileHeader}>
              <View style={styles.iconRing}>
                <LinearGradient
                  {...GoldGradientHorizontal}
                  style={styles.iconBadge}
                >
                  <Ionicons name={icon} size={16} color="#1a1208" />
                </LinearGradient>
              </View>

              {locked ? (
                <View style={styles.lockChip}>
                  <Ionicons name="lock-closed" size={10} color={GOLD} />
                  <ThemedText type="small" style={styles.lockText}>
                    {lockedLabel}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.openHint}>
                  <Ionicons name="arrow-forward" size={12} color={GOLD} />
                </View>
              )}
            </View>

            <View style={styles.tileBody}>
              <ThemedText
                type="smallBold"
                numberOfLines={1}
                style={styles.title}
              >
                {title}
              </ThemedText>
              <ThemedText type="small" numberOfLines={1} style={styles.subtitle}>
                {subtitle}
              </ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

type FeatureRowProps = {
  tourId: string;
  locked: boolean;
  delay?: number;
};

export function FeatureRow({ tourId, locked, delay = 0 }: FeatureRowProps) {
  const router = useRouter();
  const { t } = useStrings();

  const snapshot = useEntitlementsStore((state) => state.snapshot);
  const byTourId = useTourReminderStore((state) => state.byTourId);
  const [showDateModal, setShowDateModal] = useState(false);

  const tour = snapshot?.entitlements.tours.find(
    (entry) => entry.id === tourId,
  );
  const entry = byTourId[tourId];
  const lockedLabel = t("floors.locked");

  function goUnlock() {
    router.navigate("/explore");
  }

  return (
    <>
      <View style={styles.row}>
        <FeatureTile
          icon="people"
          title={t("home.findHost")}
          subtitle={t("home.findHostDesc")}
          locked={locked}
          lockedLabel={lockedLabel}
          delay={delay}
          sheenDelayMs={0}
          onPress={() =>
            locked ? goUnlock() : router.push(`/find-host/${tourId}`)
          }
        />
        <FeatureTile
          icon="notifications"
          title={t("home.reminders")}
          subtitle={t("home.remindersDesc")}
          locked={locked}
          lockedLabel={lockedLabel}
          delay={delay + 80}
          sheenDelayMs={SHEEN_CYCLE_MS / 2}
          onPress={() => (locked ? goUnlock() : setShowDateModal(true))}
        />
      </View>

      {showDateModal && tour ? (
        <SetTourDateModal
          visible
          tourTitle={tour.title}
          initialDate={entry?.tourDate}
          initialTime={entry?.startTime}
          onConfirm={(date, time) => {
            void setUserVisitDate(tourId, date, time);
            setShowDateModal(false);
          }}
          onSkip={() => setShowDateModal(false)}
          onClose={() => setShowDateModal(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.three,
  },
  tileWrap: {
    flex: 1,
  },
  pressable: {
    flex: 1,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.96,
  },
  tile: {
    height: TILE_HEIGHT,
    borderRadius: TILE_RADIUS,
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
    top: -28,
    bottom: -28,
    width: SHEEN_WIDTH,
  },
  sheenGradient: {
    flex: 1,
    width: SHEEN_WIDTH,
  },
  tileContent: {
    flex: 1,
    padding: Spacing.three,
    justifyContent: "space-between",
  },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconRing: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(225, 165, 102, 0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(225, 165, 102, 0.38)",
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  lockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(12, 10, 9, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(225, 165, 102, 0.28)",
  },
  lockText: {
    fontSize: 11,
    lineHeight: 14,
    color: GOLD,
  },
  openHint: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(225, 165, 102, 0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(225, 165, 102, 0.35)",
  },
  tileBody: {
    gap: 4,
  },
  title: {
    color: "#faf7f2",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(225, 165, 102, 0.78)",
  },
});

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';

/** Shared radius so shadow, clip, and cover image all match (Android clips badly otherwise). */
const CARD_RADIUS = 20;

type FloorCardProps = {
  name: string;
  coverUrl?: string | null;
  stopCount: number;
  stopLabel: string;
  exploreLabel: string;
  /**
   * Optional secondary line under the name. When set, replaces the default
   * "{stopCount} {stopLabel}" text (used e.g. for Map Explore hints).
   */
  subtitle?: string;
  /** Ionicons name for the explore chip (default: compass). */
  exploreIcon?: ComponentProps<typeof Ionicons>['name'];
  /** When true the card shows a lock overlay and does not open content. */
  locked?: boolean;
  lockedLabel?: string;
  /** Stagger delay for the entrance animation, in ms. */
  delay?: number;
  onPress: () => void;
};

/**
 * A premium, tappable card for one floor: cover image, name, stop count and an
 * explicit "explore" affordance so it reads as openable. Soft shadow, rounded
 * corners, and a gentle press-in scale. Locked state seals content behind a
 * lock overlay until the user has an active session + plan.
 */
export function FloorCard({
  name,
  coverUrl,
  stopCount,
  stopLabel,
  exploreLabel,
  subtitle,
  exploreIcon = 'compass',
  locked = false,
  lockedLabel = 'Locked',
  delay = 0,
  onPress,
}: FloorCardProps) {
  const theme = useTheme();
  const { t } = useStrings();
  const secondary = subtitle ?? `${stopCount} ${stopLabel}`;
  const chipLabel = locked ? lockedLabel : exploreLabel;
  const chipIcon = locked ? 'lock-closed' : exploreIcon;

  // Bouncing animation for the explore chip. Gated on focus: an uncancelled
  // infinite loop per card, on an elevated overflow-hidden container, was
  // running right through the push transition and costing frames on Android.
  const isFocused = useIsFocused();
  const bounce = useSharedValue(0);
  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(bounce);
      bounce.value = withTiming(0, { duration: 160 });
      return;
    }

    bounce.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 420, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(bounce);
  }, [bounce, isFocused]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(delay, 100)).duration(260)}
      style={styles.shadow}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
        accessibilityHint={locked ? lockedLabel : exploreLabel}
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
              style={[styles.cover, locked && styles.coverDimmed]}
              contentFit="cover"
              transition={220}
            />
          ) : (
            <View
              style={[
                styles.cover,
                { backgroundColor: theme.backgroundSelected },
                locked && styles.coverDimmed,
              ]}
            />
          )}

          <View style={styles.topRightStack}>
            <View
              style={styles.verifiedBadge}
              accessibilityLabel={t('floors.verifiedAuthentic')}
            >
              <Ionicons
                name="shield-checkmark"
                size={13}
                color={theme.primary}
              />
              <ThemedText
                type="smallBold"
                style={styles.verifiedLabel}
                numberOfLines={1}
              >
                {t('floors.verifiedAuthentic')}
              </ThemedText>
            </View>

            <Animated.View style={bounceStyle}>
              <View
                style={[
                  styles.exploreChip,
                  {
                    backgroundColor: locked
                      ? 'rgba(28, 25, 23, 0.88)'
                      : theme.primary,
                  },
                ]}
              >
                <Ionicons
                  name={chipIcon}
                  size={16}
                  color={locked ? theme.primary : theme.primaryForeground}
                />
                <ThemedText
                  type="smallBold"
                  style={{
                    color: locked ? theme.primary : theme.primaryForeground,
                  }}
                >
                  {chipLabel}
                </ThemedText>
              </View>
            </Animated.View>
          </View>

          {locked ? (
            <View style={styles.lockBadge} accessibilityElementsHidden>
              <View
                style={[
                  styles.lockBadgeInner,
                  { backgroundColor: 'rgba(28, 25, 23, 0.78)' },
                ]}
              >
                <Ionicons name="lock-closed" size={28} color={theme.primary} />
              </View>
            </View>
          ) : null}

          <View style={styles.overlay}>
            <View style={styles.textBlock}>
              <ThemedText type="subtitle" numberOfLines={1} style={styles.name}>
                {name}
              </ThemedText>
              <ThemedText type="small" numberOfLines={2} style={styles.stops}>
                {secondary}
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
    alignSelf: 'stretch',
    borderRadius: CARD_RADIUS,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  card: {
    alignSelf: 'stretch',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.96,
  },
  coverWrap: {
    width: '100%',
    height: 170,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: CARD_RADIUS,
  },
  coverDimmed: {
    opacity: 0.55,
  },
  topRightStack: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    maxWidth: '72%',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: 999,
    paddingVertical: Spacing.one + 1,
    paddingHorizontal: Spacing.two + 2,
    backgroundColor: 'rgba(28, 25, 23, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(225, 165, 102, 0.45)',
  },
  verifiedLabel: {
    flexShrink: 1,
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 14,
  },
  lockBadge: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.five,
  },
  lockBadgeInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    padding: Spacing.four,
  },
  textBlock: {
    width: '100%',
    gap: Spacing.half,
  },
  name: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  stops: {
    color: 'rgba(255, 255, 255, 0.92)',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  exploreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});

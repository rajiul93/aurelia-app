import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';

/** Shared radius so shadow, clip, and cover image all match (Android clips badly otherwise). */
const CARD_RADIUS = 28;

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

          <LinearGradient
            colors={
              locked
                ? ['rgba(12, 10, 9, 0.35)', 'rgba(12, 10, 9, 0.82)']
                : ['transparent', 'rgba(12, 10, 9, 0.72)']
            }
            style={styles.scrim}
          />

          <View
            style={styles.verifiedBadge}
            accessibilityLabel={t('floors.verifiedAuthentic')}
          >
            <Ionicons
              name="shield-checkmark"
              size={13}
              color={theme.primary}
            />
            <ThemedText type="smallBold" style={styles.verifiedLabel} numberOfLines={1}>
              {t('floors.verifiedAuthentic')}
            </ThemedText>
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
  scrim: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    bottom: 0,
  },
  verifiedBadge: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    maxWidth: '72%',
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  textBlock: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  name: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 22,
  },
  stops: {
    color: 'rgba(255, 255, 255, 0.86)',
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

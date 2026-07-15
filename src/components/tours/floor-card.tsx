import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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
  subtitle,
  exploreIcon = 'compass',
  delay = 0,
  onPress,
}: FloorCardProps) {
  const theme = useTheme();
  const secondary = subtitle ?? `${stopCount} ${stopLabel}`;

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(420).springify().damping(18)}
      style={styles.shadow}
    >
      {/*
        Inner clip layer is required on Android: elevation on the outer view
        prevents overflow:hidden from rounding the image, so radius + overflow
        live here (not on the elevated wrapper).
      */}
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

          <LinearGradient
            colors={['transparent', 'rgba(12, 10, 9, 0.72)']}
            style={styles.scrim}
          />

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
              style={[styles.exploreChip, { backgroundColor: theme.primary }]}
            >
              <Ionicons
                name={exploreIcon}
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
        // Elevation on a transparent wrapper casts the child's rounded shape.
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
  scrim: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    bottom: 0,
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
    fontSize: 22,
    lineHeight: 27,
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

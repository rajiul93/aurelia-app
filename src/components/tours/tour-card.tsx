import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useInstalledMediaUri } from '@/hooks/use-installed-media-uri';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import { useTourDownloadState } from '@/hooks/use-tour-download-state';
import { loadInstalledTour } from '@/lib/bundle/load';
import type { EntitledVersions } from '@/lib/bundle/version-compare';
import { queryKeys } from '@/lib/query/keys';

/** Shared radius so shadow, clip, and cover image all match (Android clips badly otherwise). */
const CARD_RADIUS = 20;

type TourCardProps = {
  tourId: string;
  slug: string;
  title: string;
  coverUrl?: string | null;
  /** Floors in this tour, from the catalog. 0 for a legacy flat tour. */
  floorCount: number;
  /** Stops across every floor, from the catalog. */
  stopCount: number;
  /** The user's grant covers this tour and they are signed in. */
  unlocked: boolean;
  entitledVersions?: EntitledVersions;
  /** Stagger delay for the entrance animation, in ms. */
  delay?: number;
};

/**
 * One card for one tour on Home — the unit the user actually downloads.
 *
 * The whole card is tappable and routes to whatever the tour's current state
 * calls for (unlock / prepare / open), while the `TourDownloadButton` nested
 * inside keeps its own buttons for the finer actions ("Change options"). React
 * Native gives the inner Pressable the touch, so the two never both fire.
 */
export function TourCard({
  tourId,
  slug,
  title,
  coverUrl,
  floorCount,
  stopCount,
  unlocked,
  entitledVersions,
  delay = 0,
}: TourCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const queryClient = useQueryClient();
  const { installed, updateAvailable } = useTourDownloadState(
    tourId,
    entitledVersions,
  );
  // Prefer the locally-cached cover so a downloaded tour still shows its image
  // offline; falls back to the remote url for tours not yet on disk.
  const localCoverUrl = useInstalledMediaUri(tourId, coverUrl).data ?? coverUrl;

  const parts: string[] = [];
  if (floorCount > 1) {
    parts.push(`${floorCount} ${t('tours.floors')}`);
  }
  if (stopCount > 0) {
    parts.push(
      `${stopCount} ${stopCount === 1 ? t('floors.stop') : t('floors.stops')}`,
    );
  }
  const secondary = parts.join(' · ');

  function handlePress() {
    if (!unlocked) {
      router.push('/explore');
      return;
    }

    if (installed && !updateAvailable) {
      // Warm the disk read before navigating. Without this the tour screen
      // always mounts empty and waits on a read with a deliberate
      // 0/100/300/600/1200ms retry ladder, so the placeholder is guaranteed to
      // flash on every open.
      void queryClient.prefetchQuery({
        queryKey: queryKeys.installedTour.detail(tourId),
        queryFn: async () => {
          const bundle = await loadInstalledTour(tourId);
          if (!bundle) {
            throw new Error(`Installed tour missing on disk: ${tourId}`);
          }
          return bundle;
        },
        staleTime: 60_000,
      });
      router.push(`/tour/${tourId}`);
      return;
    }

    router.push({
      pathname: '/download/[tourId]',
      params: { tourId, slug, title },
    });
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(delay, 100)).duration(260)}
      style={styles.shadow}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityHint={
          unlocked
            ? installed && !updateAvailable
              ? t('download.openOfflineTour')
              : t('download.downloadForOffline')
            : t('floors.locked')
        }
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.coverWrap}>
          {localCoverUrl ? (
            <Image
              source={{ uri: localCoverUrl }}
              style={[styles.cover, !unlocked && styles.coverDimmed]}
              contentFit="cover"
              transition={220}
            />
          ) : (
            <View
              style={[
                styles.cover,
                { backgroundColor: theme.backgroundSelected },
                !unlocked && styles.coverDimmed,
              ]}
            />
          )}

          <View
            style={styles.verifiedBadge}
            accessibilityLabel={t('floors.verifiedAuthentic')}
          >
            <Ionicons name="shield-checkmark" size={13} color={theme.primary} />
            <ThemedText
              type="smallBold"
              style={styles.verifiedLabel}
              numberOfLines={1}
            >
              {t('floors.verifiedAuthentic')}
            </ThemedText>
          </View>

          {!unlocked ? (
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
          ) : !installed || updateAvailable ? (
            <View style={styles.downloadBadge} accessibilityElementsHidden>
              <View
                style={[
                  styles.downloadBadgeInner,
                  { backgroundColor: 'rgba(28, 25, 23, 0.78)' },
                ]}
              >
                <Ionicons
                  name={updateAvailable ? 'cloud-upload-outline' : 'cloud-download-outline'}
                  size={32}
                  color={theme.primary}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.overlay}>
            <ThemedText type="subtitle" numberOfLines={2} style={styles.name}>
              {title}
            </ThemedText>
            {secondary ? (
              <ThemedText type="small" numberOfLines={1} style={styles.meta}>
                {secondary}
              </ThemedText>
            ) : null}
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
    backgroundColor: 'transparent',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.96,
  },
  coverWrap: {
    width: '100%',
    height: 250,
    justifyContent: 'flex-end',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  coverDimmed: {
    opacity: 0.55,
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
  downloadBadge: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBadgeInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    padding: Spacing.four,
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
  meta: {
    color: 'rgba(255, 255, 255, 0.92)',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

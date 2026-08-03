import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmergencyAnnouncementBanner } from '@/components/emergency-announcement-banner';
import { FeatureRow } from '@/components/home/feature-row';
import { PremiumUnlockCard } from '@/components/home/premium-unlock-card';
import { HamburgerButton } from '@/components/navigation/hamburger-button';
import { ThemedText } from '@/components/themed-text';
import { FloorCardSkeleton } from '@/components/tours/floor-card-skeleton';
import { InstalledTourCard } from '@/components/tours/installed-tour-card';
import { TourCard } from '@/components/tours/tour-card';
import { WhyBuyCard } from '@/components/tours/why-buy-card';
import { GlassCard } from '@/components/ui/glass-card';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAppContent } from '@/hooks/queries/use-app-content';
import { useCatalogTours } from '@/hooks/queries/use-catalog';
import { useEntitlementStatus } from '@/hooks/use-entitlement-status';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import {
  getCurrentTimeOfDay,
  resolveAppBackgroundUrl,
} from '@/lib/app-content/resolve-asset';
import { env } from '@/lib/env';
import { useAuthStore } from '@/store/auth-store';
import { useInstalledToursStore } from '@/store/installed-tours-store';
import { useRemoteConfig } from '@/store/release-config-store';

function getErrorMessage(
  error: unknown,
  t: ReturnType<typeof useStrings>['t'],
) {
  if (error instanceof Error && error.message === 'Network Error') {
    return t('home.networkError', { url: env.apiBaseUrl });
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t('home.checkApiConfig');
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const isSignedIn = Boolean(sessionToken);
  const { data: contentResponse } = useAppContent();
  const { venueTimezone } = useRemoteConfig();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useCatalogTours();
  const { hasActivePlan, entitledVersionsByTourId, isTourLocked } =
    useEntitlementStatus();
  const installedByTourId = useInstalledToursStore(
    (state) => state.installedByTourId,
  );

  const strings = contentResponse?.data.strings ?? {};
  // Venue slot, matching AppBackground — the two render the same photo and must
  // not disagree about what time of day it is.
  const backgroundUrl = resolveAppBackgroundUrl(
    contentResponse?.data.assets,
    getCurrentTimeOfDay(venueTimezone),
  );
  const title = strings['title.welcome'] ?? t('app.name');
  const heroOnDark = Boolean(backgroundUrl);

  const tours = data?.data ?? [];
  const installedGuides = Object.values(installedByTourId).sort((left, right) =>
    right.installedAt.localeCompare(left.installedAt),
  );
  const installedTourIds = new Set(installedGuides.map((g) => g.tourId));
  const unlockedTourIds = new Set(entitledVersionsByTourId.keys());
  // Tours the user can fetch but has not downloaded yet.
  const downloadable = tours.filter((tour) => !installedTourIds.has(tour.id));

  // One card per tour — a tour is the unit the user downloads, so floors are
  // only picked once they are inside it. Downloaded tours float to the top
  // (newest first); the rest keep catalog order.
  const installedRank = new Map(
    installedGuides.map((guide, index) => [guide.tourId, index]),
  );
  const sortedTours = [...tours].sort((left, right) => {
    const leftRank = installedRank.get(left.id);
    const rightRank = installedRank.get(right.id);

    if (leftRank !== undefined && rightRank !== undefined) {
      return leftRank - rightRank;
    }

    if (leftRank !== undefined) {
      return -1;
    }

    if (rightRank !== undefined) {
      return 1;
    }

    return 0;
  });

  // Downloaded tours the catalog did not return. The catalog query is not
  // persisted, so offline it returns nothing at all — without this the visitor
  // would lose the tour they already paid for and downloaded.
  const catalogTourIds = new Set(tours.map((tour) => tour.id));
  const offlineOnlyGuides = installedGuides.filter(
    (guide) => !catalogTourIds.has(guide.tourId),
  );

  // Prefetch the lightweight root download route so tour → prepare feels instant.
  const downloadPrefetchKey = downloadable
    .filter((tour) => unlockedTourIds.has(tour.id))
    .map((tour) => tour.id)
    .join('|');

  useEffect(() => {
    if (!isSignedIn || !downloadPrefetchKey) {
      return;
    }

    for (const tour of downloadable) {
      if (!unlockedTourIds.has(tour.id)) {
        continue;
      }

      router.prefetch({
        pathname: '/download/[tourId]',
        params: {
          tourId: tour.id,
          slug: tour.slug,
          title: tour.title,
        },
      });
    }
    // downloadable / unlockedTourIds intentionally keyed via downloadPrefetchKey
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-prefetch every render
  }, [downloadPrefetchKey, isSignedIn, router]);

  // Tour to reference for "Find Your Host": prefer an installed guide, else the
  // first catalog tour so the card still shows (locked) before any download.
  const hostTourId = installedGuides[0]?.tourId ?? tours[0]?.id;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <HamburgerButton />
          <Pressable
            accessibilityRole="button"
            hitSlop={4}
            style={({ pressed }) => [
              styles.brandChip,
              { opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <ThemedText
              type="smallBold"
              numberOfLines={1}
              style={styles.brandTitle}
            >
              {title.toLocaleUpperCase('en-US')}
            </ThemedText>
          </Pressable>
        </View>

        {!isSignedIn ? (
          <PremiumUnlockCard onPress={() => router.navigate('/explore')} />
        ) : null}
        <EmergencyAnnouncementBanner />

        {/* Find Host + Reminders row: show whenever there's a tour to reference.
            Locked (routes to unlock) until the user has an active plan. */}
        {hostTourId ? (
          <View style={styles.section}>
            <FeatureRow
              tourId={hostTourId}
              locked={!hasActivePlan}
              delay={installedGuides.length * 120 + 200}
            />
          </View>
        ) : null}
        {/* <LocalFeature /> */}
        {/* One card per tour. Locked until signed in with a grant covering it;
            then Download, and Open once it is on disk. Floors are chosen inside
            the tour, not here. */}
        {sortedTours.length > 0 || offlineOnlyGuides.length > 0 ? (
          <View style={styles.section}>
            <ThemedText
              type="smallBold"
              style={[styles.sectionTitle, heroOnDark && styles.onDarkText]}
            >
              {t('tours.yourTours')}
            </ThemedText>
            <View style={styles.cardList}>
              {offlineOnlyGuides.map((guide, index) => (
                <InstalledTourCard
                  key={guide.tourId}
                  guide={guide}
                  unlocked={!isTourLocked(guide.tourId)}
                  entitledVersions={entitledVersionsByTourId.get(guide.tourId)}
                  delay={index * 80}
                />
              ))}
              {sortedTours.map((tour, index) => {
                const floors = tour.floors ?? [];
                return (
                  <TourCard
                    key={tour.id}
                    tourId={tour.id}
                    slug={tour.slug}
                    title={tour.title}
                    coverUrl={tour.coverUrl}
                    floorCount={floors.length}
                    stopCount={floors.reduce(
                      (total, floor) => total + floor.stopCount,
                      0,
                    )}
                    unlocked={!isTourLocked(tour.id)}
                    entitledVersions={entitledVersionsByTourId.get(tour.id)}
                    delay={(offlineOnlyGuides.length + index) * 80}
                  />
                );
              })}
            </View>
          </View>
        ) : isLoading ? (
          <View style={styles.section}>
            <ThemedText
              type="smallBold"
              style={[styles.sectionTitle, heroOnDark && styles.onDarkText]}
            >
              {t('tours.yourTours')}
            </ThemedText>
            {/* Home renders TourCard, so the placeholder must be TourCard-sized. */}
            <FloorCardSkeleton count={3} cardHeight={250} radius={20} />
          </View>
        ) : null}

        {isError ? (
          <GlassCard>
            <ThemedText type="smallBold" style={styles.wrapText}>
              {t('home.couldNotLoadTours')}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.wrapText}
            >
              {getErrorMessage(error, t)}
            </ThemedText>
            <Pressable
              onPress={() => void refetch()}
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
            >
              <Ionicons
                name="refresh"
                size={16}
                color={theme.primaryForeground}
              />
              <ThemedText
                type="smallBold"
                style={{ color: theme.primaryForeground }}
              >
                {isFetching ? t('home.retrying') : t('home.tryAgain')}
              </ThemedText>
            </Pressable>
          </GlassCard>
        ) : null}

        {!isLoading && !isError && tours.length === 0 ? (
          <GlassCard>
            <ThemedText type="smallBold" style={styles.wrapText}>
              {t('home.noPublishedTours')}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.wrapText}
            >
              {t('home.publishHint')}
            </ThemedText>
          </GlassCard>
        ) : null}

        {/* Why Buy lives only where there is still a reason to sell. */}
        {!hasActivePlan ? <WhyBuyCard /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingTop: Spacing.two,
  },
  brandChip: {
    flexShrink: 1,
    marginLeft: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(225, 165, 102, 0.55)',
    // Soft premium lift
    shadowColor: '#e1a566',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  wrapText: {
    flexShrink: 1,
    alignSelf: 'stretch',
  },
  onDarkText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  onDarkMuted: {
    color: 'rgba(255, 255, 255, 0.85)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  section: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  sectionTitle: {
    alignSelf: 'stretch',
  },
  cardList: {
    alignSelf: 'stretch',
    gap: Spacing.four,
  },
  retryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
});

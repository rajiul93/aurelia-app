import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmergencyAnnouncementBanner } from "@/components/emergency-announcement-banner";
import { HamburgerButton } from "@/components/navigation/hamburger-button";
import { ThemedText } from "@/components/themed-text";
import { FloorCard } from "@/components/tours/floor-card";
import { FloorCardSkeleton } from "@/components/tours/floor-card-skeleton";
import { TourDownloadButton } from "@/components/tours/tour-download-button";
import { TourFloorCards } from "@/components/tours/tour-floor-cards";
import { WhyBuyCard } from "@/components/tours/why-buy-card";
import { FindHostCard } from "@/components/home/find-host-card";
import { GlassCard } from "@/components/ui/glass-card";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useAppContent } from "@/hooks/queries/use-app-content";
import { useCatalogTours } from "@/hooks/queries/use-catalog";
import { useEntitlementStatus } from "@/hooks/use-entitlement-status";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { resolveAppBackgroundUrl } from "@/lib/app-content/resolve-asset";
import { env } from "@/lib/env";
import { useAuthStore } from "@/store/auth-store";
import { useInstalledToursStore } from "@/store/installed-tours-store";

function getErrorMessage(
  error: unknown,
  t: ReturnType<typeof useStrings>["t"],
) {
  if (error instanceof Error && error.message === "Network Error") {
    return t("home.networkError", { url: env.apiBaseUrl });
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t("home.checkApiConfig");
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const isSignedIn = Boolean(sessionToken);
  const { data: contentResponse } = useAppContent();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useCatalogTours();
  const { hasActivePlan, entitledVersionsByTourId } = useEntitlementStatus();
  const installedByTourId = useInstalledToursStore(
    (state) => state.installedByTourId,
  );

  const strings = contentResponse?.data.strings ?? {};
  const backgroundUrl = resolveAppBackgroundUrl(contentResponse?.data.assets);
  const title = strings["title.welcome"] ?? t("app.name");
  const heroOnDark = Boolean(backgroundUrl);

  const tours = data?.data ?? [];
  const installedGuides = Object.values(installedByTourId).sort((left, right) =>
    right.installedAt.localeCompare(left.installedAt),
  );
  const installedTourIds = new Set(installedGuides.map((g) => g.tourId));
  const unlockedTourIds = new Set(entitledVersionsByTourId.keys());
  // Tours the user can fetch but has not downloaded yet — floors live in the
  // bundle, so these need a download before their floor cards can appear.
  const downloadable = tours.filter((tour) => !installedTourIds.has(tour.id));

  // Locked floor teasers from the catalog for tours that are not (yet) on disk —
  // real FloorCard UI, never a tour-level card.
  const lockedCatalogFloors = tours
    .filter((tour) => !installedTourIds.has(tour.id))
    .flatMap((tour) =>
      (tour.floors ?? []).map((floor) => ({
        tourId: tour.id,
        floor,
      })),
    );

  const showFloorsSection =
    installedGuides.length > 0 || lockedCatalogFloors.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
            <ThemedText type="smallBold" numberOfLines={1} style={styles.brandTitle}>
              {title.toLocaleUpperCase("en-US")}
            </ThemedText>
          </Pressable>
        </View>

        {!isSignedIn ? (
          <Animated.View
            entering={FadeInDown.delay(60)
              .duration(420)
              .springify()
              .damping(18)}
          >
            <GlassCard style={styles.premiumCard}>
              <View
                style={[
                  styles.premiumIcon,
                  { backgroundColor: `${theme.primary}22` },
                ]}
              >
                <Ionicons name="lock-closed" size={20} color={theme.primary} />
              </View>
              <ThemedText type="smallBold" style={styles.wrapText}>
                {t("home.premiumTitle")}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.wrapText}
              >
                {t("home.premiumSubtitle")}
              </ThemedText>
              <Pressable
                onPress={() => router.navigate("/explore")}
                style={[styles.premiumCta, { backgroundColor: theme.primary }]}
              >
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={theme.primaryForeground}
                />
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  {t("home.signInCta")}
                </ThemedText>
              </Pressable>
            </GlassCard>
          </Animated.View>
        ) : null}

        <EmergencyAnnouncementBanner />

        {/* Download first so signed-in users see offline install before floors. */}
        {sessionToken && downloadable.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.cardList}>
              {downloadable.map((tour) => (
                <GlassCard key={tour.id} style={styles.downloadCard}>
                  <ThemedText
                    type="smallBold"
                    numberOfLines={2}
                    style={styles.wrapText}
                  >
                    {tour.title}
                  </ThemedText>
                  <TourDownloadButton
                    tourId={tour.id}
                    slug={tour.slug}
                    title={tour.title}
                    unlocked={unlockedTourIds.has(tour.id)}
                    entitledVersions={entitledVersionsByTourId.get(tour.id)}
                  />
                </GlassCard>
              ))}
            </View>
          </View>
        ) : null}

        {/* Floor cards only: installed (possibly Locked) + locked catalog teasers
            for floors that are not yet downloaded. */}
        {showFloorsSection ? (
          <View style={styles.section}>
            {/* <ThemedText
              type="smallBold"
              style={[styles.sectionTitle, heroOnDark && styles.onDarkText]}
            >
              {t("floors.yourFloors")}
            </ThemedText> */}
            <View style={styles.cardList}>
              {installedGuides.map((guide, index) => (
                <TourFloorCards
                  key={guide.tourId}
                  tourId={guide.tourId}
                  baseDelay={index * 120}
                />
              ))}
              {lockedCatalogFloors.map(({ floor }, index) => (
                <FloorCard
                  key={floor.id}
                  name={floor.name}
                  coverUrl={floor.coverUrl}
                  stopCount={floor.stopCount}
                  stopLabel={
                    floor.stopCount === 1 ? t("floors.stop") : t("floors.stops")
                  }
                  exploreLabel={t("floors.explore")}
                  locked
                  lockedLabel={t("floors.locked")}
                  delay={installedGuides.length * 120 + index * 80}
                  onPress={() => router.navigate("/explore")}
                />
              ))}
            </View>
          </View>
        ) : isLoading ? (
          <View style={styles.section}>
            <ThemedText
              type="smallBold"
              style={[styles.sectionTitle, heroOnDark && styles.onDarkText]}
            >
              {t("floors.yourFloors")}
            </ThemedText>
            <FloorCardSkeleton count={3} />
          </View>
        ) : null}
        {isError ? (
          <GlassCard>
            <ThemedText type="smallBold" style={styles.wrapText}>
              {t("home.couldNotLoadTours")}
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
                {isFetching ? t("home.retrying") : t("home.tryAgain")}
              </ThemedText>
            </Pressable>
          </GlassCard>
        ) : null}

        {!isLoading && !isError && tours.length === 0 && !showFloorsSection ? (
          <GlassCard>
            <ThemedText type="smallBold" style={styles.wrapText}>
              {t("home.noPublishedTours")}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.wrapText}
            >
              {t("home.publishHint")}
            </ThemedText>
          </GlassCard>
        ) : null}

        {/* Find Your Host card: show when there are installed guides */}
        {showFloorsSection && installedGuides.length > 0 ? (
          <View style={styles.section}>
            <FindHostCard
              tourId={installedGuides[0].tourId}
              delay={installedGuides.length * 120 + 200}
            />
          </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingTop: Spacing.two,
  },
  brandChip: {
    flexShrink: 1,
    marginLeft: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(225, 165, 102, 0.55)",
    // Soft premium lift
    shadowColor: "#e1a566",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.6,
    textAlign: "center",
  },
  premiumCard: {
    borderRadius: Spacing.four,
  },
  premiumIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.one,
  },
  premiumCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  wrapText: {
    flexShrink: 1,
    alignSelf: "stretch",
  },
  onDarkText: {
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  onDarkMuted: {
    color: "rgba(255, 255, 255, 0.85)",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  section: {
    alignSelf: "stretch",
    gap: Spacing.three,
  },
  sectionTitle: {
    alignSelf: "stretch",
  },
  cardList: {
    alignSelf: "stretch",
    gap: Spacing.four,
  },
  retryButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  downloadCard: {
    gap: Spacing.three,
  },
});

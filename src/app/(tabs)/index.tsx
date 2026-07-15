import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { HamburgerButton } from "@/components/navigation/hamburger-button";
import { PageBackground } from "@/components/page-background";
import { WhyBuyCard } from "@/components/tours/why-buy-card";
import { TourFloorCards } from "@/components/tours/tour-floor-cards";
import { EmergencyAnnouncementBanner } from "@/components/emergency-announcement-banner";
import { TourDownloadButton } from "@/components/tours/tour-download-button";
import { GoldGradientButton } from "@/components/ui/gold-gradient-button";
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

function getErrorMessage(error: unknown, t: ReturnType<typeof useStrings>["t"]) {
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
  const phone = useAuthStore((state) => state.phone);
  const sessionToken = useAuthStore((state) => state.sessionToken);
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

  return (
    <PageBackground uri={backgroundUrl} imagePosition="right" noOverlay>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <HamburgerButton />
            <ThemedText
              type="smallBold"
              numberOfLines={1}
              style={[styles.brandTitle, heroOnDark && styles.onDarkText]}
            >
              {title}
            </ThemedText>
          </View>

          {/* No active plan → the choice to buy sits at the very top. */}
          {!hasActivePlan ? (
            <Animated.View
              entering={FadeInDown.duration(420).springify().damping(18)}
              style={styles.buyPlanWrap}
            >
              <GoldGradientButton
                label={t("home.choosePlan")}
                onPress={() => router.push("/explore")}
                showArrow
                style={styles.buyPlanButton}
              />
            </Animated.View>
          ) : null}

          {!phone ? (
            <Animated.View
              entering={FadeInDown.delay(60).duration(420).springify().damping(18)}
              style={[
                styles.premiumCard,
                {
                  backgroundColor: heroOnDark
                    ? "rgba(15, 16, 22, 0.55)"
                    : theme.backgroundElement,
                  borderColor: heroOnDark
                    ? "rgba(255, 255, 255, 0.18)"
                    : theme.backgroundSelected,
                },
              ]}
            >
              <View
                style={[
                  styles.premiumIcon,
                  {
                    backgroundColor: heroOnDark
                      ? "rgba(255, 255, 255, 0.14)"
                      : theme.backgroundSelected,
                  },
                ]}
              >
                <Ionicons name="lock-closed" size={20} color={theme.primary} />
              </View>
              <ThemedText
                type="smallBold"
                style={[styles.wrapText, heroOnDark && styles.onDarkText]}
              >
                {t("home.premiumTitle")}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor={heroOnDark ? undefined : "textSecondary"}
                style={[styles.wrapText, heroOnDark && styles.onDarkMuted]}
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
            </Animated.View>
          ) : null}

          <EmergencyAnnouncementBanner />

          {/* The heart of the home: one premium card per floor of each installed
              tour. Tapping a card opens that floor's map, stops and content. */}
          {installedGuides.length > 0 ? (
            <View style={styles.section}>
              <ThemedText
                type="smallBold"
                style={[styles.sectionTitle, heroOnDark && styles.onDarkText]}
              >
                {t("floors.yourFloors")}
              </ThemedText>
              <View style={styles.cardList}>
                {installedGuides.map((guide, index) => (
                  <TourFloorCards
                    key={guide.tourId}
                    tourId={guide.tourId}
                    baseDelay={index * 120}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {isLoading ? (
            <ActivityIndicator color={theme.primary} style={styles.loader} />
          ) : null}

          {isError ? (
            <View
              style={[
                styles.messageCard,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
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
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  {isFetching ? t("home.retrying") : t("home.tryAgain")}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {/* Signed in with tours still to download — a compact prompt, not a
              full cover card, so floors stay the visual focus. */}
          {sessionToken && downloadable.length > 0 ? (
            <View style={styles.section}>
              <ThemedText
                type="smallBold"
                style={[styles.sectionTitle, heroOnDark && styles.onDarkText]}
              >
                {t("home.availableToDownload")}
              </ThemedText>
              <View style={styles.cardList}>
                {downloadable.map((tour) => (
                  <View
                    key={tour.id}
                    style={[
                      styles.downloadCard,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
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
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {!isLoading && !isError && tours.length === 0 && installedGuides.length === 0 ? (
            <View
              style={[
                styles.messageCard,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
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
            </View>
          ) : null}

          {/* Why Buy lives only where there is still a reason to sell. */}
          {!hasActivePlan ? <WhyBuyCard /> : null}
        </ScrollView>
      </SafeAreaView>
    </PageBackground>
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
  brandTitle: {
    fontSize: 18,
    lineHeight: 24,
    flexShrink: 1,
    textAlign: "right",
    marginLeft: Spacing.three,
  },
  buyPlanWrap: {
    alignSelf: "stretch",
    marginTop: Spacing.one,
  },
  buyPlanButton: {
    alignSelf: "stretch",
  },
  premiumCard: {
    alignSelf: "stretch",
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
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
  loader: {
    marginTop: Spacing.five,
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
  messageCard: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  downloadCard: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
});

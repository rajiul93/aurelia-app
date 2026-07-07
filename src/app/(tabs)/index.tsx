import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { HamburgerButton } from "@/components/navigation/hamburger-button";
import { PageBackground } from "@/components/page-background";
import { WhyBuyCard } from "@/components/tours/why-buy-card";
import { GuidesHubSection } from "@/components/tours/guides-hub-section";
import { EmergencyAnnouncementBanner } from "@/components/emergency-announcement-banner";
import { TourDownloadButton } from "@/components/tours/tour-download-button";
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
  const email = useAuthStore((state) => state.email);
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const { data: contentResponse } = useAppContent();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useCatalogTours();
  const {
    isTourLocked,
    getEntitledVersions,
    entitledVersionsByTourId,
  } = useEntitlementStatus();
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
  const coverUrlByTourId = new Map(
    tours.map((tour) => [tour.id, tour.coverUrl]),
  );
  const unlockedTourIds = new Set(
    [...entitledVersionsByTourId.keys()],
  );

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
          <View style={styles.header}>
            {!email ? (
              <View
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
              </View>
            ) : installedGuides.length === 0 ? (
              <ThemedText
                type="small"
                themeColor={heroOnDark ? undefined : "primary"}
                style={[styles.wrapText, heroOnDark && styles.onDarkText]}
              >
                {t("home.signedInAs", { email: email ?? "" })}
              </ThemedText>
            ) : null}
          </View>

          <EmergencyAnnouncementBanner />

          {installedGuides.length > 0 ? (
            <GuidesHubSection
              guides={installedGuides}
              email={email}
              coverUrlByTourId={coverUrlByTourId}
              onDarkBackground={heroOnDark}
              isTourLocked={isTourLocked}
              getEntitledVersions={getEntitledVersions}
            />
          ) : null}

          {isLoading ? (
            <ActivityIndicator color={theme.primary} style={styles.loader} />
          ) : null}

          {isError ? (
            <View
              style={[
                styles.errorCard,
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

          {!isLoading && !isError && tours.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
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

          {tours.length > 0 ? (
            <ThemedText
              type="smallBold"
              style={[styles.sectionTitle, heroOnDark && styles.onDarkText]}
            >
              {installedGuides.length > 0 ? t("home.browseTours") : t("home.tourCatalog")}
            </ThemedText>
          ) : null}

          <View style={styles.tourList}>
            {tours.map((tour) => (
              <View key={tour.id} style={styles.tourCardShadow}>
                <View
                  style={[
                    styles.tourCard,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <View style={styles.coverWrap}>
                    {tour.coverUrl ? (
                      <Image
                        source={{ uri: tour.coverUrl }}
                        style={styles.cover}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.cover,
                          styles.coverFallback,
                          { backgroundColor: theme.backgroundSelected },
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.tourMeta}>
                    <ThemedText
                      type="subtitle"
                      style={styles.cardTitle}
                      numberOfLines={2}
                    >
                      {tour.title}
                    </ThemedText>
                    {sessionToken ? (
                      <TourDownloadButton
                        tourId={tour.id}
                        slug={tour.slug}
                        title={tour.title}
                        unlocked={unlockedTourIds.has(tour.id)}
                        entitledVersions={entitledVersionsByTourId.get(tour.id)}
                      />
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>

          <WhyBuyCard />
        </ScrollView>
      </SafeAreaView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  header: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    alignSelf: "stretch",
  },
  premiumCard: {
    alignSelf: "stretch",
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
    marginTop: Spacing.one,
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
  errorCard: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyCard: {
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
  sectionTitle: {
    alignSelf: "stretch",
  },
  tourList: {
    alignSelf: "stretch",
    gap: Spacing.four,
  },
  tourCardShadow: {
    alignSelf: "stretch",
    borderRadius: Spacing.four,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  tourCard: {
    alignSelf: "stretch",
    borderRadius: Spacing.four,
    overflow: "hidden",
  },
  coverWrap: {
    width: "100%",
    height: 180,
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  coverFallback: {
    opacity: 0.8,
  },
  cardTitle: {
    alignSelf: "stretch",
    fontSize: 22,
    lineHeight: 28,
  },
  tourMeta: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
});

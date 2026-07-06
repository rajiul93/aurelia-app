import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { PageBackground } from "@/components/page-background";
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
    <PageBackground
      uri={backgroundUrl}
      imagePosition="right"
      darkOverlay={heroOnDark}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            {installedGuides.length === 0 ? (
              <>
                <ThemedText
                  type="subtitle"
                  style={[styles.wrapText, heroOnDark && styles.onDarkText]}
                >
                  {title}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor={heroOnDark ? undefined : "textSecondary"}
                  style={[styles.wrapText, heroOnDark && styles.onDarkMuted]}
                >
                  {t("home.catalogSubtitle")}
                </ThemedText>
              </>
            ) : null}
            {email ? (
              installedGuides.length === 0 ? (
                <ThemedText
                  type="small"
                  themeColor={heroOnDark ? undefined : "primary"}
                  style={[styles.wrapText, heroOnDark && styles.onDarkText]}
                >
                  {t("home.signedInAs", { email: email ?? "" })}
                </ThemedText>
              ) : null
            ) : (
              <Pressable
                onPress={() => router.navigate("/explore")}
                style={StyleSheet.flatten([
                  styles.signInButton,
                  { backgroundColor: theme.primary },
                ])}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  {t("home.signInCta")}
                </ThemedText>
              </Pressable>
            )}
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
              <View
                key={tour.id}
                style={[
                  styles.tourCard,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
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
                <View style={styles.tourMeta}>
                  <ThemedText type="smallBold" style={styles.wrapText}>
                    {tour.title}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.wrapText}
                  >
                    {tour.slug}
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
            ))}
          </View>
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
  header: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    alignSelf: "stretch",
  },
  signInButton: {
    alignSelf: "flex-start",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  wrapText: {
    flexShrink: 1,
    alignSelf: "stretch",
  },
  onDarkText: {
    color: "#ffffff",
  },
  onDarkMuted: {
    color: "rgba(255, 255, 255, 0.78)",
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
    gap: Spacing.three,
  },
  tourCard: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    height: 160,
  },
  coverFallback: {
    opacity: 0.8,
  },
  tourMeta: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
});

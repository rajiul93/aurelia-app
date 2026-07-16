import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { GuidedWalkSection } from "@/components/navigation/guided-walk-section";
import { StopListCard } from "@/components/tours/stop-list-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Spacing } from "@/constants/theme";
import { useInstalledTourView } from "@/hooks/use-installed-tour-view";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import {
  localizeTourDescription,
  localizeTourTitle,
  pickAudienceTranslation,
} from "@/lib/bundle/localize";
import { orderSpotsAcrossFloors } from "@/lib/bundle/route-order";
import { useSpotBookmarksStore } from "@/store/spot-bookmarks-store";
import { useTourProgressStore } from "@/store/tour-progress-store";

const NO_BOOKMARKS: string[] = [];

export default function TourRouteScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const { data: content, isResolving, hasRawContent, tourId: resolvedTourId, preferences } =
    useInstalledTourView(tourId);
  const completedSpotIds = useTourProgressStore(
    (state) => state.byTourId[resolvedTourId ?? ""]?.completedSpotIds,
  );
  const bookmarkedSpotIds = useSpotBookmarksStore(
    (state) => state.byTourId[resolvedTourId ?? ""] ?? NO_BOOKMARKS,
  );
  const bookmarkedSet = new Set(bookmarkedSpotIds);

  if (isResolving) {
    return (
      <ThemedView transparent style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (!hasRawContent || !content || !resolvedTourId) {
    return (
      <ThemedView transparent style={styles.centered}>
        <ThemedText type="smallBold">{t("tour.notInstalled")}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("tour.downloadFromHome")}
        </ThemedText>
      </ThemedView>
    );
  }
  const contentLanguage = preferences?.contentLanguage ?? "en";
  const audience = preferences?.audience ?? "ADULTS";
  const tourTitle = localizeTourTitle(content.tour, contentLanguage, audience);
  const tourDescription = localizeTourDescription(
    content.tour,
    contentLanguage,
    audience,
  );
  const spots = orderSpotsAcrossFloors(content);
  const completedIds = completedSpotIds ?? [];
  const completedSet = new Set(completedIds);
  const progressPercent =
    spots.length > 0 ? (completedIds.length / spots.length) * 100 : 0;

  return (
    <ThemedView transparent style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={tourTitle}
            subtitle={t("tour.stopsOffline", {
              count: spots.length,
              version: content.versions.tourBundleVersion,
            })}
            onBack={() => router.dismissTo("/")}
          />

          {tourDescription ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.description}
            >
              {tourDescription}
            </ThemedText>
          ) : null}

          <View
            style={[
              styles.progressCard,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <View style={styles.progressHeader}>
              <ThemedText type="smallBold">{t("tour.progress")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("guides.stopsCompleted", {
                  completed: completedIds.length,
                  total: spots.length,
                })}
              </ThemedText>
            </View>
            <ProgressBar value={progressPercent} />
          </View>

          <GuidedWalkSection tourId={resolvedTourId} content={content} />

          <View style={styles.helpSection}>
            <Pressable
              onPress={() => router.push(`/find-host/${resolvedTourId}`)}
              style={[
                styles.helpButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={theme.primary}
              />
              <ThemedText type="smallBold">{"Find Your Host"}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.askHint}>
                {"Locate an on-site assistant"}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => router.push(`/tour/${resolvedTourId}/chat`)}
              style={[
                styles.askButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color={theme.primary}
              />
              <ThemedText type="smallBold">{t("tour.askAurelia")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.askHint}>
                {t("tour.askAureliaHint")}
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {t("tour.chooseStop")}
          </ThemedText>

          <View style={styles.stopList}>
            {spots.map((spot, index) => {
              const translation = pickAudienceTranslation(
                spot.translations.map((entry) => ({
                  ...entry,
                  audience: entry.audience ?? "ADULTS",
                })),
                contentLanguage,
                audience,
              );
              const completed = completedSet.has(spot.id);
              const isNext = !completed && index === completedIds.length;

              return (
                <StopListCard
                  key={spot.id}
                  index={index}
                  title={translation?.title ?? t("tour.stopFallback")}
                  subtitle={translation?.shortDesc}
                  completed={completed}
                  isNext={isNext}
                  bookmarked={bookmarkedSet.has(spot.id)}
                  onPress={() =>
                    router.push(`/tour/${resolvedTourId}/spot/${spot.id}`)
                  }
                />
              );
            })}
          </View>

          {completedIds.length === spots.length && spots.length > 0 ? (
            <ThemedText type="small" themeColor="primary" style={styles.doneText}>
              {t("tour.allStopsCompleted")}
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
    gap: Spacing.two,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  description: {
    alignSelf: "stretch",
  },
  progressCard: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  helpSection: {
    gap: Spacing.two,
    alignSelf: "stretch",
  },
  helpButton: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  askButton: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  askHint: {
    alignSelf: "stretch",
  },
  sectionTitle: {
    alignSelf: "stretch",
  },
  stopList: {
    gap: Spacing.two,
    alignSelf: "stretch",
  },
  doneText: {
    alignSelf: "center",
  },
});

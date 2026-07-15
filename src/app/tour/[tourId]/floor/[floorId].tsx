import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { FloorCard } from "@/components/tours/floor-card";
import { StopListCard } from "@/components/tours/stop-list-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Spacing } from "@/constants/theme";
import { useInstalledMediaUri } from "@/hooks/use-installed-media-uri";
import { useInstalledTourView } from "@/hooks/use-installed-tour-view";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { findFloor, getFloorName, getFloorScope } from "@/lib/bundle/floor-routing";
import { pickAudienceTranslation } from "@/lib/bundle/localize";
import { orderSpotsByRoute } from "@/lib/bundle/route-order";
import { normalizeRouteParam } from "@/lib/router/normalize-route-param";
import { useSpotBookmarksStore } from "@/store/spot-bookmarks-store";
import { useTourProgressStore } from "@/store/tour-progress-store";

const NO_BOOKMARKS: string[] = [];

/**
 * A single floor: a "Map Explore" card that opens the map view for this floor,
 * and the list of *only this floor's* stops. Deliberately does not touch the map
 * itself — it just hands off to the existing nav screen with a floorId.
 */
export default function FloorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const { tourId: tourIdParam, floorId: floorIdParam } = useLocalSearchParams<{
    tourId: string;
    floorId: string;
  }>();
  const floorId = normalizeRouteParam(floorIdParam) ?? "";

  const {
    data: content,
    isResolving,
    hasRawContent,
    tourId,
    preferences,
  } = useInstalledTourView(tourIdParam);
  const completedSpotIds = useTourProgressStore(
    (state) => state.byTourId[tourId ?? ""]?.completedSpotIds,
  );
  const bookmarkedSpotIds = useSpotBookmarksStore(
    (state) => state.byTourId[tourId ?? ""] ?? NO_BOOKMARKS,
  );
  const bookmarkedSet = new Set(bookmarkedSpotIds);

  const floor = content ? findFloor(content, floorId) : null;
  const floorCoverRemote = floor?.coverUrl ?? null;
  const floorCoverLocal =
    useInstalledMediaUri(tourId, floorCoverRemote).data ?? floorCoverRemote;

  if (isResolving) {
    return (
      <ThemedView transparent style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (!hasRawContent || !content || !tourId) {
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

  const floorName = floor
    ? getFloorName(floor, contentLanguage, audience) ??
      t("floors.floorN", { number: floor.floorNo })
    : t("floors.yourFloors");

  // Floor-scoped: this floor's spots, in this floor's route order. Never another
  // floor's stops.
  const scope = getFloorScope(content, floorId);
  const spots = orderSpotsByRoute(scope.spots, scope.route);

  const completedIds = completedSpotIds ?? [];
  const completedSet = new Set(completedIds);
  const completedOnFloor = spots.filter((spot) =>
    completedSet.has(spot.id),
  ).length;
  const progressPercent =
    spots.length > 0 ? (completedOnFloor / spots.length) * 100 : 0;

  return (
    <ThemedView transparent style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={floorName}
            subtitle={t("tour.stopsOffline", {
              count: spots.length,
              version: content.versions.tourBundleVersion,
            })}
            onBack={() => router.back()}
          />

          {/* Map Explore — same premium card language as home floor cards. */}
          <FloorCard
            name={t("floors.mapExplore")}
            coverUrl={floorCoverLocal}
            stopCount={spots.length}
            stopLabel={spots.length === 1 ? t("floors.stop") : t("floors.stops")}
            subtitle={t("floors.mapExploreHint")}
            exploreLabel={t("floors.explore")}
            exploreIcon="map"
            onPress={() =>
              router.push(`/tour/${tourId}/nav?floorId=${floorId}`)
            }
          />

          {spots.length > 0 ? (
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
                    completed: completedOnFloor,
                    total: spots.length,
                  })}
                </ThemedText>
              </View>
              <ProgressBar value={progressPercent} />
            </View>
          ) : null}

          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {t("tour.chooseStop")}
          </ThemedText>

          {spots.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t("floors.noStops")}
            </ThemedText>
          ) : null}

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
              const isNext = !completed && index === completedOnFloor;

              return (
                <StopListCard
                  key={spot.id}
                  index={index}
                  title={translation?.title ?? t("tour.stopFallback")}
                  subtitle={translation?.shortDesc}
                  completed={completed}
                  isNext={isNext}
                  bookmarked={bookmarkedSet.has(spot.id)}
                  onPress={() => router.push(`/tour/${tourId}/spot/${spot.id}`)}
                />
              );
            })}
          </View>
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
  sectionTitle: {
    alignSelf: "stretch",
  },
  stopList: {
    gap: Spacing.two,
    alignSelf: "stretch",
  },
});

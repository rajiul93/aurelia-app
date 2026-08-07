import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { GuidedWalkSection } from "@/components/navigation/guided-walk-section";
import { FloorCard } from "@/components/tours/floor-card";
import { FloorCardSkeleton } from "@/components/tours/floor-card-skeleton";
import { StopListCard } from "@/components/tours/stop-list-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Spacing } from "@/constants/theme";
import { useInstalledMediaUri } from "@/hooks/use-installed-media-uri";
import { useInstalledTourView } from "@/hooks/use-installed-tour-view";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { getFloorName, getSpotsForFloor } from "@/lib/bundle/floor-routing";
import {
  localizeTourTitle,
  pickAudienceTranslation,
} from "@/lib/bundle/localize";
import { orderSpotsAcrossFloors } from "@/lib/bundle/route-order";
import { useSpotBookmarksStore } from "@/store/spot-bookmarks-store";
import { useTourProgressStore } from "@/store/tour-progress-store";

const NO_BOOKMARKS: string[] = [];

type FloorPickerCardProps = {
  tourId: string;
  name: string;
  coverUrl?: string | null;
  stopCount: number;
  delay: number;
  onPress: () => void;
};

/**
 * One floor card. Split out so it can resolve the cover to the locally-cached
 * copy — the bundle stores a remote R2 url, but the app is offline-first, so the
 * image only shows without a network once it has been cached on install. The
 * resolver falls back to the remote url when online / not yet cached.
 */
function FloorPickerCard({
  tourId,
  name,
  coverUrl,
  stopCount,
  delay,
  onPress,
}: FloorPickerCardProps) {
  const { t } = useStrings();
  const localCoverUrl = useInstalledMediaUri(tourId, coverUrl).data ?? coverUrl;

  return (
    <FloorCard
      name={name}
      coverUrl={localCoverUrl}
      stopCount={stopCount}
      stopLabel={stopCount === 1 ? t("floors.stop") : t("floors.stops")}
      exploreLabel={t("floors.explore")}
      delay={delay}
      onPress={onPress}
    />
  );
}

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
  // All derived data is memoized above the early returns (hooks cannot run
  // after them). Unmemoized, `orderSpotsAcrossFloors` plus a full spots filter
  // *per floor* ran on every render of this screen.
  const bookmarkedSet = useMemo(
    () => new Set(bookmarkedSpotIds),
    [bookmarkedSpotIds],
  );

  const spots = useMemo(
    () => (content ? orderSpotsAcrossFloors(content) : []),
    [content],
  );

  // Multi-floor (v2) bundles pick a floor first; a v1 bundle has no floors at
  // all, so it keeps going straight to the flat stop list.
  const floors = useMemo(
    () =>
      [...(content?.floors ?? [])].sort(
        (left, right) => left.floorNo - right.floorNo,
      ),
    [content],
  );

  // Counted once here instead of `getSpotsForFloor(...)` inside the render map,
  // which was O(floors × spots) every render.
  const stopCountByFloor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const floor of content?.floors ?? []) {
      counts.set(floor.id, getSpotsForFloor(content!, floor.id).length);
    }
    return counts;
  }, [content]);

  const completedIds = useMemo(
    () => completedSpotIds ?? [],
    [completedSpotIds],
  );
  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);

  // Same ScrollView shell as the loaded state, with placeholders in it. A
  // centered spinner here replaced the entire layout, so everything jumped into
  // place the moment the disk read landed — mid-transition.
  if (isResolving) {
    return (
      <ThemedView transparent style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ScreenHeader title="" onBack={() => router.dismissTo("/")} />
            <FloorCardSkeleton count={3} />
          </ScrollView>
        </SafeAreaView>
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
            onBack={() => router.dismissTo("/")}
            onDark
          />

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

          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {floors.length > 0 ? t("tour.chooseFloor") : t("tour.chooseStop")}
          </ThemedText>

          {floors.length > 0 ? (
            <View style={styles.floorList}>
              {floors.map((floor, index) => (
                <FloorPickerCard
                  key={floor.id}
                  tourId={resolvedTourId}
                  name={
                    getFloorName(floor, contentLanguage, audience) ??
                    t("floors.floorN", { number: floor.floorNo })
                  }
                  coverUrl={floor.coverUrl}
                  stopCount={stopCountByFloor.get(floor.id) ?? 0}
                  delay={index * 80}
                  onPress={() =>
                    router.push(`/tour/${resolvedTourId}/floor/${floor.id}`)
                  }
                />
              ))}
            </View>
          ) : (
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
          )}

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
  floorList: {
    gap: Spacing.four,
    alignSelf: "stretch",
  },
  doneText: {
    alignSelf: "center",
  },
});

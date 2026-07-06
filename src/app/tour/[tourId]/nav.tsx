import { useLocalSearchParams, useRouter } from "expo-router";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OffRouteBanner } from "@/components/navigation/off-route-banner";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useNavigationApproachAudio } from "@/hooks/use-navigation-approach-audio";
import { useNavigationSession } from "@/hooks/use-navigation-session";
import { useInstalledTourView } from "@/hooks/use-installed-tour-view";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import {
  localizeTourTitle,
  pickAudienceTranslation,
} from "@/lib/bundle/localize";
import { orderSpotsByRoute } from "@/lib/bundle/route-order";
import { isMapLibreNativeAvailable } from "@/lib/map/native-available";
import { getNextIncompleteSpot } from "@/lib/navigation/proximity";
import { useTourProgressStore } from "@/store/tour-progress-store";

const TourMapView = lazy(() =>
  import("@/components/navigation/tour-map-view").then((module) => ({
    default: module.TourMapView,
  })),
);

export default function TourNavigationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const { data: content, isLoading, isError, preferences } =
    useInstalledTourView(tourId);
  const completedSpotIds =
    useTourProgressStore((state) => state.byTourId[tourId ?? ""]?.completedSpotIds) ??
    [];
  const [approachSpotId, setApproachSpotId] = useState<string | null>(null);

  const orderedSpots = useMemo(
    () =>
      content ? orderSpotsByRoute(content.tour.spots, content.route) : [],
    [content],
  );
  const completedSet = useMemo(
    () => new Set(completedSpotIds),
    [completedSpotIds],
  );
  const nextSpot = useMemo(
    () => getNextIncompleteSpot(orderedSpots, completedSet),
    [orderedSpots, completedSet],
  );
  const nextSpotTitle = useMemo(() => {
    if (!nextSpot || !preferences) {
      return null;
    }

    return pickAudienceTranslation(
      nextSpot.translations.map((entry) => ({
        ...entry,
        audience: entry.audience ?? "ADULTS",
      })),
      preferences.contentLanguage,
      preferences.audience,
    )?.title;
  }, [nextSpot, preferences]);

  const approachSpot = useMemo(
    () => orderedSpots.find((spot) => spot.id === approachSpotId) ?? null,
    [approachSpotId, orderedSpots],
  );

  const { canNavigate, snapshot } = useNavigationSession({
    tourId: tourId ?? "",
    content: content ?? undefined,
    enabled: Boolean(tourId && content),
    onApproachSpot: setApproachSpotId,
  });

  useNavigationApproachAudio(
    tourId ?? "",
    approachSpot,
    Boolean(approachSpotId && approachSpot),
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (isError || !content || !tourId) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="smallBold">{t("tour.notInstalled")}</ThemedText>
      </ThemedView>
    );
  }

  if (!canNavigate || !isMapLibreNativeAvailable()) {
    const hint = !isMapLibreNativeAvailable()
      ? t("nav.requiresDevBuild")
      : t("nav.unavailableHint");

    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="smallBold">{t("nav.unavailableTitle")}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { borderColor: theme.backgroundSelected }]}
        >
          <ThemedText type="smallBold">{t("accessLock.goBack")}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const tourTitle = preferences
    ? localizeTourTitle(content.tour, preferences.contentLanguage, preferences.audience)
    : content.tour.slug;

  return (
    <ThemedView style={styles.container}>
      <Suspense
        fallback={
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} />
          </View>
        }
      >
        <TourMapView
          tourId={tourId}
          content={content}
          orderedSpots={orderedSpots}
          snapshot={snapshot}
        />
      </Suspense>

      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backChip,
              { backgroundColor: "rgba(28, 25, 23, 0.82)" },
            ]}
          >
            <ThemedText type="smallBold" style={styles.onDarkText}>
              {t("accessLock.goBack")}
            </ThemedText>
          </Pressable>
          <View
            style={[
              styles.titleChip,
              { backgroundColor: "rgba(28, 25, 23, 0.82)" },
            ]}
          >
            <ThemedText type="smallBold" style={styles.onDarkText}>
              {tourTitle}
            </ThemedText>
            {nextSpotTitle ? (
              <ThemedText type="small" style={styles.onDarkMuted}>
                {t("nav.nextStop", { title: nextSpotTitle })}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <View style={styles.bottomBar}>
          {snapshot?.status === "offRoute" ? (
            <OffRouteBanner distanceM={snapshot.distanceOffRouteM} />
          ) : null}

          {snapshot && snapshot.proximity.distanceToNextStopM !== null ? (
            <View
              style={[
                styles.distanceChip,
                { backgroundColor: "rgba(28, 25, 23, 0.82)" },
              ]}
            >
              <ThemedText type="smallBold" style={styles.onDarkText}>
                {t("nav.distanceToStop", {
                  distance: Math.round(snapshot.proximity.distanceToNextStopM),
                })}
              </ThemedText>
            </View>
          ) : null}

          <Pressable
            onPress={() => router.push(`/tour/${tourId}`)}
            style={[
              styles.listButton,
              { backgroundColor: theme.primary },
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.primaryForeground }}>
              {t("nav.openStopList")}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
    gap: Spacing.two,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  topBar: {
    gap: Spacing.two,
  },
  backChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  titleChip: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  bottomBar: {
    gap: Spacing.two,
  },
  distanceChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  listButton: {
    alignSelf: "stretch",
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: "center",
  },
  backButton: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  onDarkText: {
    color: "#ffffff",
  },
  onDarkMuted: {
    color: "rgba(255,255,255,0.78)",
  },
});

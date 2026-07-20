import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CompassOverlay } from "@/components/navigation/compass-overlay";
import { OffRouteBanner } from "@/components/navigation/off-route-banner";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { useNavigationSession } from "@/hooks/use-navigation-session";
import { useInstalledTourView } from "@/hooks/use-installed-tour-view";
import { useMapPackReady } from "@/hooks/use-map-pack-ready";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import {
  localizeTourTitle,
  pickAudienceTranslation,
} from "@/lib/bundle/localize";
import { FloorSelector } from "@/components/navigation/floor-selector";
import { getFloorScope } from "@/lib/bundle/floor-routing";
import { orderSpotsByRoute } from "@/lib/bundle/route-order";
import { useFloorSelection } from "@/hooks/use-floor-selection";
import { isMapLibreNativeAvailable } from "@/lib/map/native-available";
import { speakApproach } from "@/lib/navigation/approach-voice";
import { ensureOfflineMapPack, readMapPackMeta } from "@/lib/map/offline-pack";
import { getNextIncompleteSpot } from "@/lib/navigation/proximity";
import { queryKeys } from "@/lib/query/keys";
import { useRemoteConfig } from "@/store/release-config-store";
import { useTourProgressStore } from "@/store/tour-progress-store";

const TourMapView = lazy(() =>
  import("@/components/navigation/tour-map-view").then((module) => ({
    default: module.TourMapView,
  })),
);

export default function TourNavigationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, language } = useStrings();
  const remote = useRemoteConfig();
  const queryClient = useQueryClient();
  const { tourId: routeTourId, floorId: initialFloorId } =
    useLocalSearchParams<{ tourId: string; floorId?: string }>();
  const {
    data: content,
    rawContent,
    isResolving,
    hasRawContent,
    tourId,
    preferences,
  } = useInstalledTourView(routeTourId);
  const mapPackReady = useMapPackReady(tourId, rawContent ?? undefined);
  const completedSpotIds =
    useTourProgressStore((state) => state.byTourId[tourId ?? ""]?.completedSpotIds) ??
    [];
  const [mapReloadKey, setMapReloadKey] = useState(0);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  // Pushing a spot detail leaves this screen mounted, so the GPS session keeps
  // running and would announce the next stop from behind the stack. Tracked in
  // a ref rather than via useIsFocused(): `enableFreeze(true)` +
  // `freezeOnBlur` stop a blurred screen from re-rendering, so a state-based
  // flag is not guaranteed to reach the GPS callback — and reading a ref keeps
  // onApproachSpot stable, which the tracking effect depends on.
  const isFocusedRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      return () => {
        isFocusedRef.current = false;
      };
    }, []),
  );

  // The walk runs on one floor: its spots, its route. Crossing floors is a
  // transition point, not a route edge.
  const { selectedFloorId, setSelectedFloorId, isMultiFloor } =
    useFloorSelection(content ?? null, initialFloorId);
  const orderedSpots = useMemo(() => {
    if (!content) {
      return [];
    }

    const scope = getFloorScope(content, selectedFloorId);
    return orderSpotsByRoute(scope.spots, scope.route);
  }, [content, selectedFloorId]);
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

  // Localized stop names keyed by spot id, spoken by the approach cue.
  const stopTitleById = useMemo(() => {
    const titles: Record<string, string> = {};
    if (!preferences) {
      return titles;
    }

    orderedSpots.forEach((spot, index) => {
      const title = pickAudienceTranslation(
        spot.translations.map((entry) => ({
          ...entry,
          audience: entry.audience ?? "ADULTS",
        })),
        preferences.contentLanguage,
        preferences.audience,
      )?.title;
      titles[spot.id] = title ?? `#${index + 1}`;
    });

    return titles;
  }, [orderedSpots, preferences]);

  // Spoken once when the walker comes within approachRadiusM of the next
  // incomplete stop — never for whichever pin happens to be nearest. TTS from
  // the bundle's own title, so it works offline; the recorded narration that
  // used to auto-play here was removed deliberately (see CLAUDE.md §12).
  const announceApproach = useCallback(
    (spotId: string) => {
      if (!isFocusedRef.current || !remote.enableVoiceGuidance) {
        return;
      }

      const title = stopTitleById[spotId];
      if (!title) {
        return;
      }

      speakApproach(spotId, t("nav.approachVoice", { title }), language);
    },
    [language, remote.enableVoiceGuidance, stopTitleById, t],
  );

  const { canNavigate, snapshot, isAwaitingLocation, locationStatus } =
    useNavigationSession({
      tourId: tourId ?? "",
      content: content ?? undefined,
      floorId: selectedFloorId,
      enabled: Boolean(tourId && content),
      onApproachSpot: announceApproach,
    });

  const heading = useDeviceHeading(canNavigate);

  const handleRefresh = useCallback(() => {
    setMapLoadFailed(false);
    // Remount the map so MapLibre rebuilds the style and re-attaches every
    // GeoJSON layer — the reliable recovery for a blank/partial offline map.
    setMapReloadKey((key) => key + 1);
    // Reload the installed tour content (route/footprint geometry) from disk.
    void queryClient.invalidateQueries({ queryKey: queryKeys.installedTour.all });
    // Rebuild the offline tile pack if it never completed.
    if (tourId && rawContent) {
      void (async () => {
        const meta = await readMapPackMeta(tourId);
        if (!meta || meta.status !== "ready") {
          await ensureOfflineMapPack(tourId, rawContent);
        }
      })();
    }
  }, [queryClient, rawContent, tourId]);

  // Warm the offline tile pack as soon as the tour content is available. The
  // map mount is gated on useMapPackReady; this keeps pack status fresh if the
  // user returns to nav after a failed first attempt.
  useEffect(() => {
    if (!tourId || !rawContent || !mapPackReady) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const meta = await readMapPackMeta(tourId);
      if (!cancelled && meta?.status !== "ready") {
        await ensureOfflineMapPack(tourId, rawContent);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapPackReady, rawContent, tourId]);

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

  if (!mapPackReady) {
    return (
      <ThemedView transparent style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
        <ThemedText type="small" themeColor="textSecondary">
          {t("nav.preparingMap")}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!canNavigate || !isMapLibreNativeAvailable()) {
    const hint = !isMapLibreNativeAvailable()
      ? t("nav.requiresDevBuild")
      : t("nav.unavailableHint");

    return (
      <ThemedView transparent style={styles.centered}>
        <ThemedText type="smallBold">{t("nav.unavailableTitle")}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { borderColor: theme.backgroundSelected }]}
        >
          <Ionicons name="arrow-back" size={16} color={theme.text} />
          <ThemedText type="smallBold">{t("accessLock.goBack")}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const tourTitle = preferences
    ? localizeTourTitle(content.tour, preferences.contentLanguage, preferences.audience)
    : content.tour.slug;

  return (
    <ThemedView transparent style={styles.container}>
      <Suspense
        fallback={
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} />
          </View>
        }
      >
        <TourMapView
          key={mapReloadKey}
          tourId={tourId}
          content={content}
          floorId={selectedFloorId}
          orderedSpots={orderedSpots}
          snapshot={snapshot}
          onLoadError={() => setMapLoadFailed(true)}
        />
      </Suspense>

      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.backChip,
                { backgroundColor: "rgba(28, 25, 23, 0.82)" },
              ]}
            >
              <Ionicons name="arrow-back" size={16} color="#ffffff" />
              <ThemedText type="smallBold" style={styles.onDarkText}>
                {t("accessLock.goBack")}
              </ThemedText>
            </Pressable>

            <View style={styles.topRight}>
              <Pressable
                onPress={handleRefresh}
                accessibilityLabel={t("nav.refresh")}
                style={[
                  styles.iconChip,
                  {
                    backgroundColor: mapLoadFailed
                      ? theme.primary
                      : "rgba(28, 25, 23, 0.82)",
                  },
                ]}
              >
                <Ionicons
                  name="refresh"
                  size={20}
                  color={mapLoadFailed ? theme.primaryForeground : "#ffffff"}
                />
              </Pressable>
              <CompassOverlay heading={heading} />
            </View>
          </View>
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

          {isMultiFloor && content && preferences && tourId ? (
            <FloorSelector
              tourId={tourId}
              content={content}
              selectedFloorId={selectedFloorId}
              onSelectFloor={setSelectedFloorId}
              language={preferences.contentLanguage}
              audience={preferences.audience}
            />
          ) : null}
        </View>

        <View style={styles.bottomBar}>
          {locationStatus === "denied" ? (
            <View
              style={[
                styles.statusChip,
                { backgroundColor: "rgba(127, 29, 29, 0.88)" },
              ]}
            >
              <ThemedText type="small" style={styles.onDarkText}>
                {t("nav.locationDenied")}
              </ThemedText>
            </View>
          ) : isAwaitingLocation ? (
            <View
              style={[
                styles.statusChip,
                { backgroundColor: "rgba(28, 25, 23, 0.82)" },
              ]}
            >
              <ActivityIndicator color="#ffffff" size="small" />
              <ThemedText type="smallBold" style={styles.onDarkText}>
                {t("nav.locatingYou")}
              </ThemedText>
            </View>
          ) : null}

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
            <Ionicons name="list" size={18} color={theme.primaryForeground} />
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
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  backChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
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
  statusChip: {
    alignSelf: "stretch",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  listButton: {
    alignSelf: "stretch",
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
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

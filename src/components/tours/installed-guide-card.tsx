import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { GuidedWalkSection } from "@/components/navigation/guided-walk-section";
import { ThemedText } from "@/components/themed-text";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Spacing } from "@/constants/theme";
import { useInstalledTourView } from "@/hooks/use-installed-tour-view";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { getTourStopsPath } from "@/lib/bundle/tour-navigation";
import {
  isUpdateAvailable,
  type EntitledVersions,
} from "@/lib/bundle/version-compare";
import { useTourProgressStore } from "@/store/tour-progress-store";
import type { InstalledTourMeta } from "@/types/tour-bundle";

type InstalledGuideCardProps = {
  guide: InstalledTourMeta;
  coverUrl?: string | null;
  locked?: boolean;
  entitledVersions?: EntitledVersions | null;
};


export function InstalledGuideCard({
  guide,
  coverUrl,
  locked = false,
  entitledVersions,
}: InstalledGuideCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const { data: content } = useInstalledTourView(guide.tourId);
  const progress = useTourProgressStore(
    (state) => state.byTourId[guide.tourId],
  );
  const completedSpotIds = progress?.completedSpotIds ?? [];

  const totalStops = guide.totalStops || content?.tour.spots.length || 0;
  const completedCount = completedSpotIds.length;
  const progressPercent =
    totalStops > 0 ? (completedCount / totalStops) * 100 : 0;
  const allComplete = totalStops > 0 && completedCount >= totalStops;
  const updateAvailable =
    !locked &&
    entitledVersions &&
    isUpdateAvailable(guide, entitledVersions);

  function handleStartTour() {
    if (locked) {
      router.navigate("/explore");
      return;
    }

    router.push(getTourStopsPath(guide.tourId));
  }

  function handleUpdate() {
    router.push({
      pathname: "/tour/[tourId]/prepare",
      params: {
        tourId: guide.tourId,
        slug: guide.slug,
        title: guide.title,
        mode: "update",
      },
    });
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" />
      ) : null}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <ThemedText type="smallBold" style={styles.title}>
              {guide.title}
            </ThemedText>
            <View style={styles.offlineRow}>
              <Ionicons
                name={locked ? "lock-closed" : "shield-checkmark"}
                size={14}
                color={locked ? theme.textSecondary : theme.primary}
              />
              <ThemedText
                type="small"
                themeColor={locked ? "textSecondary" : "primary"}
              >
                {locked ? t("guides.accessRequired") : t("guides.readyOffline")}
              </ThemedText>
            </View>
          </View>
          <View
            style={[
              styles.emojiBadge,
              { borderColor: theme.backgroundSelected },
            ]}
          >
            <ThemedText style={styles.emoji}>🗺️</ThemedText>
          </View>
        </View>

        {updateAvailable ? (
          <Pressable
            onPress={handleUpdate}
            style={[
              styles.updateBanner,
              {
                backgroundColor: `${theme.primary}18`,
                borderColor: theme.primary,
              },
            ]}
          >
            <Ionicons name="cloud-download-outline" size={18} color={theme.primary} />
            <ThemedText type="smallBold" themeColor="primary" style={styles.updateText}>
              {t("guides.updateAvailable")}
            </ThemedText>
          </Pressable>
        ) : null}

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              {t("guides.tourProgress")}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t("guides.stopsCompleted", {
                completed: completedCount,
                total: totalStops,
              })}
            </ThemedText>
          </View>
          <ProgressBar value={progressPercent} />
        </View>

        {!locked && content ? (
          <GuidedWalkSection tourId={guide.tourId} content={content} />
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={handleStartTour}
            disabled={locked}
            style={[
              styles.primaryButton,
              {
                backgroundColor: locked
                  ? theme.backgroundSelected
                  : theme.primary,
              },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{
                color: locked ? theme.textSecondary : theme.primaryForeground,
              }}
            >
              {locked
                ? t("guides.restoreAccess")
                : allComplete
                  ? t("guides.reviewTour")
                  : completedCount === 0
                    ? t("guides.startTour")
                    : t("guides.continueTour")}
            </ThemedText>
            {!locked ? (
              <Ionicons
                name="play"
                size={18}
                color={theme.primaryForeground}
                style={styles.buttonIcon}
              />
            ) : null}
          </Pressable>

          {!locked ? (
            <Pressable
              onPress={() => router.push(`/tour/${guide.tourId}/chat`)}
              style={[
                styles.secondaryButton,
                {
                  borderColor: theme.backgroundSelected,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <ThemedText type="smallBold">{t("guides.askAurelia")}</ThemedText>
              <Ionicons
                name="chatbubble-ellipses"
                size={18}
                color={theme.primary}
                style={styles.buttonIcon}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    height: 120,
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  titleBlock: {
    flex: 1,
    gap: Spacing.one,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  offlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  emojiBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 24,
  },
  progressBlock: {
    gap: Spacing.two,
  },
  updateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  updateText: {
    flex: 1,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
  },
  buttonIcon: {
    position: "absolute",
    right: Spacing.four,
  },
});

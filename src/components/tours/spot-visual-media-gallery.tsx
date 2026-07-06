import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { SpotVideoPlayer } from "@/components/tours/spot-video-player";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useInstalledMediaUri } from "@/hooks/use-installed-media-uri";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import {
  getSpotMediaByType,
  type SpotMediaType,
} from "@/lib/bundle/spot-media";
import type { BundleSpot } from "@/types/bundle-content";

type SpotVisualMediaGalleryProps = {
  tourId: string;
  spot: BundleSpot;
  onDark?: boolean;
};

type MediaTab = Exclude<SpotMediaType, "AUDIO">;

export function SpotVisualMediaGallery({
  tourId,
  spot,
  onDark = false,
}: SpotVisualMediaGalleryProps) {
  const theme = useTheme();
  const { t } = useStrings();
  const [activeTab, setActiveTab] = useState<MediaTab>("VIDEO");
  const [indices, setIndices] = useState<Record<MediaTab, number>>({
    VIDEO: 0,
    IMAGE: 0,
  });

  const mediaByTab = useMemo(
    () => ({
      VIDEO: getSpotMediaByType(spot, "VIDEO"),
      IMAGE: getSpotMediaByType(spot, "IMAGE"),
    }),
    [spot],
  );

  const availableTabs = (["VIDEO", "IMAGE"] as const).filter(
    (tab) => mediaByTab[tab].length > 0,
  );

  const resolvedTab = availableTabs.includes(activeTab)
    ? activeTab
    : (availableTabs[0] ?? "VIDEO");
  const activeItems = mediaByTab[resolvedTab];
  const activeIndex =
    activeItems.length === 0
      ? 0
      : Math.min(indices[resolvedTab], activeItems.length - 1);
  const activeItem = activeItems[activeIndex] ?? null;
  const playbackUrl = useInstalledMediaUri(tourId, activeItem?.url).data;

  if (availableTabs.length === 0) {
    return null;
  }

  const panelBg = onDark ? "rgba(255,255,255,0.08)" : theme.backgroundElement;
  const tabBarBg = onDark ? "rgba(255,255,255,0.06)" : theme.backgroundElement;

  function goTo(delta: -1 | 1) {
    if (activeItems.length === 0) {
      return;
    }

    const nextIndex =
      (activeIndex + delta + activeItems.length) % activeItems.length;

    setIndices((current) => ({ ...current, [resolvedTab]: nextIndex }));
  }

  return (
    <View style={styles.container}>
      {availableTabs.length > 1 ? (
        <View style={[styles.tabBar, { backgroundColor: tabBarBg }]}>
          {availableTabs.map((tab) => {
            const selected = resolvedTab === tab;

            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  selected
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: "transparent" },
                ]}
              >
                <Ionicons
                  name={tab === "VIDEO" ? "videocam" : "images"}
                  size={16}
                  color={selected ? theme.primaryForeground : theme.textSecondary}
                />
                <ThemedText
                  type="smallBold"
                  style={{
                    color: selected ? theme.primaryForeground : theme.text,
                  }}
                >
                  {tab === "VIDEO" ? t("spot.mediaVideo") : t("spot.mediaImages")}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <ThemedText
          type="smallBold"
          style={{ color: onDark ? theme.primary : theme.text }}
        >
          {resolvedTab === "VIDEO"
            ? t("spot.mediaVideo")
            : t("spot.mediaImages")}
        </ThemedText>
      )}

      <View style={[styles.panel, { backgroundColor: panelBg }]}>
        {activeItem && playbackUrl ? (
          <>
            {resolvedTab === "VIDEO" ? (
              <SpotVideoPlayer key={activeItem.id} url={playbackUrl} />
            ) : (
              <Image
                key={activeItem.id}
                source={{ uri: playbackUrl }}
                style={styles.image}
                contentFit="cover"
              />
            )}

            {activeItems.length > 1 ? (
              <View style={styles.navigator}>
                <Pressable onPress={() => goTo(-1)} style={styles.navButton}>
                  <Ionicons name="chevron-back" size={20} color={theme.primary} />
                </Pressable>
                <ThemedText
                  type="small"
                  style={{ color: onDark ? "rgba(255,255,255,0.6)" : undefined }}
                  themeColor={onDark ? undefined : "textSecondary"}
                >
                  {activeIndex + 1} / {activeItems.length}
                </ThemedText>
                <Pressable onPress={() => goTo(1)} style={styles.navButton}>
                  <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    gap: Spacing.two,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: Spacing.three,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  panel: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: Spacing.two,
  },
  navigator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    padding: Spacing.two,
  },
});

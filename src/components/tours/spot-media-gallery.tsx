import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { SpotAudioPlayer } from "@/components/tours/spot-audio-player";
import { SpotVideoPlayer } from "@/components/tours/spot-video-player";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useInstalledMediaUri } from "@/hooks/use-installed-media-uri";
import { useTheme } from "@/hooks/use-theme";
import {
  getSpotMediaByType,
  type SpotMediaType,
} from "@/lib/bundle/spot-media";
import { useRemoteConfig } from "@/store/release-config-store";
import type { BundleSpot } from "@/types/bundle-content";

type SpotMediaGalleryProps = {
  tourId: string;
  spot: BundleSpot;
};

type MediaTab = SpotMediaType;

const TABS: Array<{
  id: MediaTab;
  label: string;
  icon: "musical-notes" | "videocam" | "images";
}> = [
  { id: "AUDIO", label: "Audio", icon: "musical-notes" },
  { id: "VIDEO", label: "Video", icon: "videocam" },
  { id: "IMAGE", label: "Images", icon: "images" },
];

function emptyCopy(tab: MediaTab) {
  switch (tab) {
    case "AUDIO":
      return "No audio guides for this stop yet.";
    case "VIDEO":
      return "No videos for this stop yet.";
    case "IMAGE":
      return "No images for this stop yet.";
  }
}

export function SpotMediaGallery({ tourId, spot }: SpotMediaGalleryProps) {
  const theme = useTheme();
  const remote = useRemoteConfig();
  const [activeTab, setActiveTab] = useState<MediaTab>("AUDIO");
  const [indices, setIndices] = useState<Record<MediaTab, number>>({
    AUDIO: 0,
    VIDEO: 0,
    IMAGE: 0,
  });

  const mediaByTab = useMemo(
    () => ({
      AUDIO: getSpotMediaByType(spot, "AUDIO"),
      VIDEO: getSpotMediaByType(spot, "VIDEO"),
      IMAGE: getSpotMediaByType(spot, "IMAGE"),
    }),
    [spot],
  );

  const activeItems = mediaByTab[activeTab];
  const activeIndex =
    activeItems.length === 0
      ? 0
      : Math.min(indices[activeTab], activeItems.length - 1);
  const activeItem = activeItems[activeIndex] ?? null;
  const hasMultiple = activeItems.length > 1;
  const playbackUrl = useInstalledMediaUri(tourId, activeItem?.url).data;

  function selectTab(tab: MediaTab) {
    setActiveTab(tab);
  }

  function goTo(delta: -1 | 1) {
    if (activeItems.length === 0) {
      return;
    }

    const nextIndex =
      (activeIndex + delta + activeItems.length) % activeItems.length;

    setIndices((current) => ({ ...current, [activeTab]: nextIndex }));
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.tabBar,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          const count = mediaByTab[tab.id].length;

          return (
            <Pressable
              key={tab.id}
              onPress={() => selectTab(tab.id)}
              style={[
                styles.tab,
                selected
                  ? { backgroundColor: theme.primary }
                  : { backgroundColor: "transparent" },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={selected ? theme.primaryForeground : theme.textSecondary}
              />
              <ThemedText
                type="smallBold"
                style={{
                  color: selected ? theme.primaryForeground : theme.text,
                }}
              >
                {tab.label}
              </ThemedText>
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: selected
                      ? theme.primaryForeground
                      : theme.backgroundSelected,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selected ? theme.primary : theme.textSecondary,
                    fontSize: 11,
                  }}
                >
                  {count}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.panel,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        {activeItem && playbackUrl ? (
          <>
            {activeTab === "AUDIO" ? (
              remote.enableVoiceGuidance ? (
                <SpotAudioPlayer key={activeItem.id} url={playbackUrl} />
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Voice guidance is temporarily disabled.
                </ThemedText>
              )
            ) : null}

            {activeTab === "VIDEO" ? (
              <SpotVideoPlayer key={activeItem.id} url={playbackUrl} />
            ) : null}

            {activeTab === "IMAGE" ? (
              <Image
                key={activeItem.id}
                source={{ uri: playbackUrl }}
                style={styles.image}
                contentFit="cover"
              />
            ) : null}

            {hasMultiple ? (
              <View style={styles.navigator}>
                <Pressable
                  onPress={() => goTo(-1)}
                  style={[
                    styles.navButton,
                    { backgroundColor: theme.background },
                  ]}
                  accessibilityLabel="Previous media"
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={theme.primary}
                  />
                  <ThemedText type="smallBold" themeColor="primary">
                    Previous
                  </ThemedText>
                </Pressable>

                <ThemedText type="small" themeColor="textSecondary">
                  {activeIndex + 1} / {activeItems.length}
                </ThemedText>

                <Pressable
                  onPress={() => goTo(1)}
                  style={[
                    styles.navButton,
                    { backgroundColor: theme.background },
                  ]}
                  accessibilityLabel="Next media"
                >
                  <ThemedText type="smallBold" themeColor="primary">
                    Next
                  </ThemedText>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.primary}
                  />
                </Pressable>
              </View>
            ) : (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.singleItemLabel}
              >
                1 item
              </ThemedText>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name={
                activeTab === "AUDIO"
                  ? "musical-notes"
                  : activeTab === "VIDEO"
                    ? "videocam"
                    : "images"
              }
              size={28}
              color={theme.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {emptyCopy(activeTab)}
            </ThemedText>
          </View>
        )}
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
    paddingHorizontal: Spacing.one,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.one,
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
    gap: Spacing.two,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  singleItemLabel: {
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
});

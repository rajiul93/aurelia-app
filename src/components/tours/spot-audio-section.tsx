import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { SpotAudioPlayer } from "@/components/tours/spot-audio-player";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useInstalledMediaUri } from "@/hooks/use-installed-media-uri";
import { useRemoteConfig } from "@/store/release-config-store";
import { getSpotMediaByType } from "@/lib/bundle/spot-media";
import type { BundleSpot } from "@/types/bundle-content";
import { Ionicons } from "@react-native-vector-icons/ionicons";

type SpotAudioSectionProps = {
  tourId: string;
  spot: BundleSpot;
  variant?: "card" | "immersive";
};

export function SpotAudioSection({
  tourId,
  spot,
  variant = "immersive",
}: SpotAudioSectionProps) {
  const remote = useRemoteConfig();
  const audioItems = useMemo(
    () => getSpotMediaByType(spot, "AUDIO"),
    [spot],
  );
  const [index, setIndex] = useState(0);
  const activeIndex =
    audioItems.length > 0 ? Math.min(index, audioItems.length - 1) : 0;
  const activeItem = audioItems[activeIndex] ?? null;
  const playbackUrl = useInstalledMediaUri(tourId, activeItem?.url).data;

  if (
    audioItems.length === 0 ||
    !remote.enableVoiceGuidance ||
    !activeItem ||
    !playbackUrl
  ) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SpotAudioPlayer
        key={activeItem.id}
        url={playbackUrl}
        variant={variant}
      />

      {audioItems.length > 1 ? (
        <View style={styles.navigator}>
          <Pressable
            onPress={() =>
              setIndex(
                (current) =>
                  (current - 1 + audioItems.length) % audioItems.length,
              )
            }
            style={styles.navButton}
          >
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <ThemedText type="small" style={styles.navLabel}>
            {activeIndex + 1} / {audioItems.length}
          </ThemedText>
          <Pressable
            onPress={() =>
              setIndex((current) => (current + 1) % audioItems.length)
            }
            style={styles.navButton}
          >
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    gap: Spacing.two,
  },
  navigator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
  },
  navButton: {
    padding: Spacing.one,
  },
  navLabel: {
    color: "rgba(255,255,255,0.5)",
  },
});

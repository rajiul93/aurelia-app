import { VideoView, useVideoPlayer } from "expo-video";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type SpotVideoPlayerProps = {
  url: string;
  onDark?: boolean;
};

export function SpotVideoPlayer({ url, onDark = false }: SpotVideoPlayerProps) {
  const theme = useTheme();
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
  });

  return (
    <View
      style={[
        styles.container,
        // Over the dark photo backdrop the card carries no fill, so the caption
        // cannot use `textSecondary` — it is near-black in the light palette.
        onDark
          ? styles.containerBare
          : { backgroundColor: theme.backgroundElement },
      ]}
    >
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: true }}
      />
      <ThemedText
        type="small"
        style={onDark ? styles.captionOnDark : undefined}
        themeColor={onDark ? undefined : "textSecondary"}
      >
        Use the player controls to play, pause, and scrub.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    overflow: "hidden",
    padding: Spacing.two,
    gap: Spacing.two,
  },
  containerBare: {
    paddingHorizontal: 0,
  },
  captionOnDark: {
    color: "rgba(255,255,255,0.6)",
  },
  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: Spacing.two,
    backgroundColor: "#000",
  },
});

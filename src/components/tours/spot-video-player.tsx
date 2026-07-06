import { VideoView, useVideoPlayer } from "expo-video";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type SpotVideoPlayerProps = {
  url: string;
};

export function SpotVideoPlayer({ url }: SpotVideoPlayerProps) {
  const theme = useTheme();
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
  });

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundElement }]}
    >
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: true }}
      />
      <ThemedText type="small" themeColor="textSecondary">
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
  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: Spacing.two,
    backgroundColor: "#000",
  },
});

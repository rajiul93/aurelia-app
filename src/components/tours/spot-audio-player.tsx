import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";

import { ProgressBar } from "@/components/ui/progress-bar";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { GoldGradientHorizontal } from "@/theme/gradients";

type SpotAudioPlayerProps = {
  url: string;
  variant?: "card" | "immersive";
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function SpotAudioPlayer({
  url,
  variant = "card",
}: SpotAudioPlayerProps) {
  const theme = useTheme();
  const { t } = useStrings();
  const player = useAudioPlayer(url, { downloadFirst: true, updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const immersive = variant === "immersive";

  const duration = status.duration || player.duration || 0;
  const currentTime = status.currentTime || player.currentTime || 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isPlaying = status.playing || player.playing;

  function togglePlayback() {
    if (isPlaying) {
      player.pause();
      return;
    }

    player.play();
  }

  function skipBy(seconds: number) {
    const nextTime = Math.min(
      Math.max(0, currentTime + seconds),
      duration || currentTime + seconds,
    );
    void player.seekTo(nextTime);
  }

  const skipColor = immersive ? "rgba(255,255,255,0.7)" : theme.textSecondary;
  const timeColor = immersive ? "rgba(255,255,255,0.5)" : theme.textSecondary;

  return (
    <View
      style={[
        styles.container,
        immersive
          ? styles.containerImmersive
          : { backgroundColor: theme.backgroundElement },
      ]}
    >
      {!immersive ? (
        <ThemedText type="smallBold">{t("spot.audioGuide")}</ThemedText>
      ) : null}

      <View style={styles.controlsRow}>
        <Pressable onPress={() => skipBy(-15)} hitSlop={8} style={styles.skipButton}>
          <Ionicons name="play-back" size={18} color={skipColor} />
        </Pressable>

        <Pressable onPress={togglePlayback} hitSlop={4}>
          <LinearGradient
            {...GoldGradientHorizontal}
            style={styles.playButton}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color="#1a1208"
            />
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => skipBy(15)} hitSlop={8} style={styles.skipButton}>
          <Ionicons name="play-forward" size={18} color={skipColor} />
        </Pressable>

        <View style={styles.progressColumn}>
          <ProgressBar
            value={progress}
            variant={immersive ? "gold" : "default"}
          />
          <View style={styles.timeRow} pointerEvents="none">
            <ThemedText type="small" style={[styles.timeText, { color: timeColor }]}>
              {formatTime(currentTime)}
            </ThemedText>
            <ThemedText type="small" style={[styles.timeText, { color: timeColor }]}>
              {formatTime(duration)}
            </ThemedText>
          </View>
        </View>
      </View>

      {!status.isLoaded && !player.isLoaded ? (
        <ThemedText
          type="small"
          style={{ color: timeColor, textAlign: "center" }}
        >
          {t("spot.loadingAudio")}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  containerImmersive: {
    padding: 0,
    borderRadius: 0,
    gap: Spacing.one,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    // Room for time labels that sit under the centered progress bar
    marginBottom: 16,
  },
  progressColumn: {
    flex: 1,
    height: 40,
    justifyContent: "center",
  },
  timeRow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 42,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    fontSize: 11,
    lineHeight: 14,
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 40,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

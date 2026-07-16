import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import {
  isUpdateAvailable,
  type EntitledVersions,
} from "@/lib/bundle/version-compare";
import { useInstalledToursStore } from "@/store/installed-tours-store";

type TourDownloadButtonProps = {
  tourId: string;
  slug: string;
  title: string;
  unlocked: boolean;
  entitledVersions?: EntitledVersions;
};

function PulsingDownloadButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  const theme = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.78, 1]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.995, 1]) }],
  }));

  return (
    <Animated.View style={[styles.pulseWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        style={[styles.button, styles.buttonFull, { backgroundColor: theme.primary }]}
      >
        <Ionicons name={icon} size={16} color={theme.primaryForeground} />
        <ThemedText
          type="smallBold"
          style={{ color: theme.primaryForeground }}
        >
          {label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export function TourDownloadButton({
  tourId,
  slug,
  title,
  unlocked,
  entitledVersions,
}: TourDownloadButtonProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const installed = useInstalledToursStore(
    (state) => state.installedByTourId[tourId] ?? null,
  );

  function openPrepare() {
    router.push({
      pathname: "/download/[tourId]",
      params: {
        tourId,
        slug,
        title,
      },
    });
  }

  if (!unlocked) {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.wrapText}>
        {t("download.notIncluded")}
      </ThemedText>
    );
  }

  const updateAvailable =
    installed &&
    entitledVersions &&
    isUpdateAvailable(installed, entitledVersions);

  if (installed && !updateAvailable) {
    return (
      <View style={styles.actions}>
        <ThemedText type="small" themeColor="primary" style={styles.wrapText}>
          {t("download.installedOffline", { version: installed.tourBundleVersion })}
          {installed.localMediaFileCount
            ? ` · ${t("download.mediaFilesLocal", { count: installed.localMediaFileCount })}`
            : ""}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.wrapText}>
          {installed.downloadPreferences?.audience ?? "ADULTS"} ·{" "}
          {installed.downloadPreferences?.contentLanguage ?? "en"} ·{" "}
          {installed.downloadPreferences?.downloadMode ?? "FULL"}
        </ThemedText>
        <Pressable
          onPress={() => router.push(`/tour/${tourId}`)}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          <Ionicons
            name="map-outline"
            size={16}
            color={theme.primaryForeground}
          />
          <ThemedText
            type="smallBold"
            style={{ color: theme.primaryForeground }}
          >
            {t("download.openOfflineTour")}
          </ThemedText>
        </Pressable>
        <Pressable onPress={openPrepare} style={styles.textButton}>
          <Ionicons name="options-outline" size={14} color={theme.primary} />
          <ThemedText type="linkPrimary">{t("download.changeOptions")}</ThemedText>
        </Pressable>
      </View>
    );
  }

  const label = installed
    ? t("download.updateOfflineTour")
    : t("download.downloadForOffline");
  const icon = installed ? "cloud-upload-outline" : "cloud-download-outline";

  return (
    <View style={styles.actions}>
      <PulsingDownloadButton
        label={label}
        icon={icon}
        onPress={openPrepare}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignSelf: "stretch",
    gap: Spacing.one,
  },
  wrapText: {
    flexShrink: 1,
    alignSelf: "stretch",
  },
  pulseWrap: {
    alignSelf: "stretch",
    width: "100%",
    marginTop: Spacing.one,
  },
  button: {
    alignSelf: "flex-start",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  buttonFull: {
    alignSelf: "stretch",
    width: "100%",
    minWidth: undefined,
  },
  textButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
});

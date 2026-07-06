import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

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
      pathname: "/tour/[tourId]/prepare",
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
          style={StyleSheet.flatten([
            styles.button,
            { backgroundColor: theme.primary },
          ])}
        >
          <ThemedText
            type="smallBold"
            style={{ color: theme.primaryForeground }}
          >
            {t("download.openOfflineTour")}
          </ThemedText>
        </Pressable>
        <Pressable onPress={openPrepare} style={styles.textButton}>
          <ThemedText type="linkPrimary">{t("download.changeOptions")}</ThemedText>
        </Pressable>
      </View>
    );
  }

  const label = installed
    ? t("download.updateOfflineTour")
    : t("download.downloadForOffline");

  return (
    <View style={styles.actions}>
      <Pressable
        onPress={openPrepare}
        style={StyleSheet.flatten([
          styles.button,
          { backgroundColor: theme.primary },
        ])}
      >
        <ThemedText type="smallBold" style={{ color: theme.primaryForeground }}>
          {label}
        </ThemedText>
      </Pressable>
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
  button: {
    alignSelf: "flex-start",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
    minWidth: 160,
    alignItems: "center",
  },
  textButton: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.one,
  },
});

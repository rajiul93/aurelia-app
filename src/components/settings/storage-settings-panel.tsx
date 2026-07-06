import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useRemoveInstalledTour } from "@/hooks/mutations/use-remove-installed-tour";
import { useStorageSummary } from "@/hooks/queries/use-storage-summary";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { getApiErrorMessage } from "@/lib/api-error";
import { MIN_FREE_SPACE_BYTES } from "@/lib/storage/constants";
import { formatBytes } from "@/lib/storage/format-bytes";

export function StorageSettingsPanel() {
  const theme = useTheme();
  const { t } = useStrings();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useStorageSummary();
  const removeTour = useRemoveInstalledTour();

  function confirmRemoveTour(tourId: string, title: string) {
    Alert.alert(
      t("storage.removeTourTitle"),
      t("storage.removeTourMessage", { title }),
      [
        { text: t("storage.cancel"), style: "cancel" },
        {
          text: t("storage.remove"),
          style: "destructive",
          onPress: () => {
            void removeTour.mutateAsync(tourId);
          },
        },
      ],
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement },
      ]}
    >
      <ThemedText type="smallBold">{t("storage.title")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("storage.subtitle")}
      </ThemedText>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : null}

      {isError ? (
        <View style={styles.errorBlock}>
          <ThemedText type="small" style={styles.errorText}>
            {getApiErrorMessage(error, t("storage.couldNotRead"))}
          </ThemedText>
          <Pressable onPress={() => void refetch()} style={styles.textButton}>
            <ThemedText type="linkPrimary">
              {isFetching ? t("common.refreshing") : t("common.tryAgain")}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {data ? (
        <>
          {data.isLowStorage ? (
            <View
              style={[
                styles.warningBanner,
                { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText type="smallBold">{t("storage.lowStorage")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("storage.lowStorageHint", {
                  size: formatBytes(MIN_FREE_SPACE_BYTES),
                })}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <ThemedText type="small" themeColor="textSecondary">
                {t("storage.appData")}
              </ThemedText>
              <ThemedText type="smallBold">
                {formatBytes(data.totalUsedBytes)}
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText type="small" themeColor="textSecondary">
                {t("storage.tours")}
              </ThemedText>
              <ThemedText type="smallBold">
                {formatBytes(data.toursUsedBytes)}
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText type="small" themeColor="textSecondary">
                {t("storage.freeOnDevice")}
              </ThemedText>
              <ThemedText type="smallBold">
                {formatBytes(data.availableBytes)}
              </ThemedText>
            </View>
          </View>

          {data.tours.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t("storage.noToursInstalled")}
            </ThemedText>
          ) : (
            <View style={styles.tourList}>
              {data.tours.map((tour) => (
                <View
                  key={tour.tourId}
                  style={[
                    styles.tourRow,
                    { borderColor: theme.backgroundSelected },
                  ]}
                >
                  <View style={styles.tourMeta}>
                    <ThemedText type="smallBold">{tour.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatBytes(tour.sizeBytes)}
                      {tour.localMediaFileCount
                        ? ` · ${t("storage.mediaFiles", { count: tour.localMediaFileCount })}`
                        : ""}
                    </ThemedText>
                  </View>
                  <Pressable
                    disabled={removeTour.isPending}
                    onPress={() => confirmRemoveTour(tour.tourId, tour.title)}
                    style={styles.removeButton}
                  >
                    <ThemedText type="smallBold" style={styles.removeText}>
                      {t("storage.remove")}
                    </ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  loader: {
    alignSelf: "flex-start",
  },
  errorBlock: {
    gap: Spacing.one,
  },
  errorText: {
    color: "#dc2626",
  },
  textButton: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.one,
  },
  warningBanner: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  summaryItem: {
    minWidth: "30%",
    gap: Spacing.half,
  },
  tourList: {
    gap: Spacing.two,
  },
  tourRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  tourMeta: {
    flex: 1,
    gap: Spacing.half,
  },
  removeButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  removeText: {
    color: "#dc2626",
  },
});

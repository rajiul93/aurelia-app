import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { GoldGradientButton } from "@/components/ui/gold-gradient-button";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import type { StringKey } from "@/i18n/strings";
import { parseLocalDate } from "@/lib/tour-reminder/schedule-math";
import { useEntitlementsStore } from "@/store/entitlements-store";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import { useTourReminderStore } from "@/store/tour-reminder-store";

const CHECKLIST_ITEMS: { id: string; labelKey: StringKey }[] = [
  { id: "ticket", labelKey: "visitChecklist.item.ticket" },
  { id: "id", labelKey: "visitChecklist.item.id" },
  { id: "charged", labelKey: "visitChecklist.item.charged" },
  { id: "offline", labelKey: "visitChecklist.item.offline" },
  { id: "headphones", labelKey: "visitChecklist.item.headphones" },
  { id: "early", labelKey: "visitChecklist.item.early" },
];

export default function VisitChecklistScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const { tourId } = useLocalSearchParams<{ tourId: string }>();

  const tour = useEntitlementsStore((state) =>
    state.snapshot?.entitlements.tours.find((entry) => entry.id === tourId),
  );
  const entry = useTourReminderStore((state) =>
    tourId ? state.byTourId[tourId] : undefined,
  );
  const toggleChecklistItem = useTourReminderStore(
    (state) => state.toggleChecklistItem,
  );
  const installed = useInstalledToursStore((state) =>
    tourId ? state.installedByTourId[tourId] ?? null : null,
  );

  const checklist = entry?.checklist ?? {};

  const visitDate = parseLocalDate(entry?.tourDate);
  const dateLabel = visitDate
    ? visitDate.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <ThemedView transparent style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScreenHeader
          title={t("visitChecklist.title")}
          subtitle={tour?.title}
          onBack={() => router.back()}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="small" themeColor="textSecondary">
            {t("visitChecklist.subtitle")}
          </ThemedText>

          {dateLabel ? (
            <View
              style={[
                styles.dateCard,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <Ionicons name="calendar" size={18} color={theme.primary} />
              <View style={styles.dateText}>
                <ThemedText type="smallBold">
                  {t("visitChecklist.dateLine", { date: dateLabel })}
                </ThemedText>
                {entry?.startTime ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t("visitChecklist.arriveHint", { time: entry.startTime })}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.list}>
            {CHECKLIST_ITEMS.map((item) => {
              const checked = Boolean(checklist[item.id]);
              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    tourId && void toggleChecklistItem(tourId, item.id)
                  }
                  style={[
                    styles.row,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: checked
                        ? theme.primary
                        : theme.backgroundSelected,
                    },
                  ]}
                >
                  <Ionicons
                    name={checked ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={checked ? theme.primary : theme.textSecondary}
                  />
                  <ThemedText type="small" style={styles.rowLabel}>
                    {t(item.labelKey)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {tour ? (
            installed ? (
              <GoldGradientButton
                label={t("visitChecklist.openTour")}
                icon="map"
                fullWidth
                onPress={() => router.push(`/tour/${tour.id}`)}
              />
            ) : (
              <GoldGradientButton
                label={t("visitChecklist.download")}
                icon="cloud-download"
                fullWidth
                onPress={() =>
                  router.push({
                    pathname: "/tour/[tourId]/prepare",
                    params: { tourId: tour.id, slug: tour.slug, title: tour.title },
                  })
                }
              />
            )
          ) : null}

          <Pressable onPress={() => router.back()} style={styles.doneButton}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t("visitChecklist.done")}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  dateText: {
    flex: 1,
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowLabel: {
    flex: 1,
  },
  doneButton: {
    alignSelf: "center",
    paddingVertical: Spacing.two,
  },
});

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { SetTourDateModal } from "@/components/tour-reminder/set-tour-date-modal";
import { ThemedText } from "@/components/themed-text";
import { GlassCard } from "@/components/ui/glass-card";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { parseLocalDate } from "@/lib/tour-reminder/schedule-math";
import { clearUserVisitDate, setUserVisitDate } from "@/lib/tour-reminder/sync";
import { useAuthStore } from "@/store/auth-store";
import { useEntitlementsStore } from "@/store/entitlements-store";
import { useTourReminderStore } from "@/store/tour-reminder-store";

type EntitledTour = NonNullable<
  ReturnType<typeof useEntitlementsStore.getState>["snapshot"]
>["entitlements"]["tours"];

const EMPTY_TOURS: EntitledTour = [];

function formatVisitDate(tourDate: string | null | undefined) {
  const date = parseLocalDate(tourDate);
  if (!date) {
    return null;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function TourDateSettingsPanel() {
  const theme = useTheme();
  const { t } = useStrings();
  const sessionToken = useAuthStore((state) => state.sessionToken);
  // Select the stable snapshot ref and derive the array in render — a `?? []`
  // inside the selector returns a fresh array each call and loops useSyncExternalStore.
  const snapshot = useEntitlementsStore((state) => state.snapshot);
  const tours = snapshot?.entitlements.tours ?? EMPTY_TOURS;
  const byTourId = useTourReminderStore((state) => state.byTourId);

  const [editingTourId, setEditingTourId] = useState<string | null>(null);

  if (!sessionToken || tours.length === 0) {
    return null;
  }

  const editingTour = tours.find((tour) => tour.id === editingTourId) ?? null;
  const editingEntry = editingTourId ? byTourId[editingTourId] : undefined;

  return (
    <GlassCard>
      <ThemedText type="smallBold">{t("settings.tourDates")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("settings.tourDatesHint")}
      </ThemedText>

      <View style={styles.list}>
        {tours.map((tour) => {
          const entry = byTourId[tour.id];
          const dateLabel = formatVisitDate(entry?.tourDate);

          return (
            <View key={tour.id} style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText type="small">{tour.title}</ThemedText>
                <ThemedText
                  type="small"
                  themeColor={dateLabel ? "primary" : "textSecondary"}
                >
                  {dateLabel ?? t("settings.tourDateNotSet")}
                </ThemedText>
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => setEditingTourId(tour.id)}
                  style={[styles.action, { borderColor: theme.backgroundSelected }]}
                  hitSlop={6}
                >
                  <Ionicons
                    name={dateLabel ? "create-outline" : "calendar-outline"}
                    size={16}
                    color={theme.primary}
                  />
                  <ThemedText type="smallBold">
                    {dateLabel
                      ? t("settings.tourDateChange")
                      : t("settings.tourDateSet")}
                  </ThemedText>
                </Pressable>

                {dateLabel ? (
                  <Pressable
                    onPress={() => void clearUserVisitDate(tour.id)}
                    style={styles.clear}
                    hitSlop={6}
                  >
                    <ThemedText type="small" themeColor="textSecondary">
                      {t("settings.tourDateClear")}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {editingTour ? (
        <SetTourDateModal
          visible
          tourTitle={editingTour.title}
          initialDate={editingEntry?.tourDate}
          initialTime={editingEntry?.startTime}
          onConfirm={(date, time) => {
            void setUserVisitDate(editingTour.id, date, time);
            setEditingTourId(null);
          }}
          onSkip={() => setEditingTourId(null)}
          onClose={() => setEditingTourId(null)}
        />
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  row: {
    gap: Spacing.two,
  },
  rowText: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  clear: {
    paddingVertical: Spacing.one,
  },
});

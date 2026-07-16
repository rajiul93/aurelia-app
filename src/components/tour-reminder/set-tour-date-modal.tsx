import { Ionicons } from "@react-native-vector-icons/ionicons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { GoldGradientButton } from "@/components/ui/gold-gradient-button";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { requestNotificationPermission } from "@/lib/tour-reminder/scheduler";

type SetTourDateModalProps = {
  visible: boolean;
  tourTitle: string;
  /** Prefill (e.g. editing from Settings). "YYYY-MM-DD" / "HH:mm". */
  initialDate?: string | null;
  initialTime?: string | null;
  onConfirm: (tourDate: string, startTime: string | null) => void;
  onSkip: () => void;
  onClose: () => void;
};

/** Local "YYYY-MM-DD" (device zone), matching what the server/store expect. */
function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeString(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function defaultVisitDate() {
  // Three days out so all of D-3/D-2/D-1 can still schedule.
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return defaultVisitDate();
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return defaultVisitDate();
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function parseTime(value: string | null | undefined) {
  const base = new Date();
  base.setSeconds(0, 0);
  const match = value ? /^(\d{2}):(\d{2})$/.exec(value) : null;
  if (match) {
    base.setHours(Number(match[1]), Number(match[2]));
  } else {
    base.setHours(9, 0);
  }
  return base;
}

export function SetTourDateModal({
  visible,
  tourTitle,
  initialDate,
  initialTime,
  onConfirm,
  onSkip,
  onClose,
}: SetTourDateModalProps) {
  const theme = useTheme();
  const { t } = useStrings();
  const insets = useSafeAreaInsets();

  const [date, setDate] = useState<Date>(() => parseDate(initialDate));
  const [time, setTime] = useState<string | null>(initialTime ?? null);
  const [timeValue, setTimeValue] = useState<Date>(() => parseTime(initialTime));
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === "ios");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function onDateChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }
    if (selected) {
      setDate(selected);
    }
  }

  function onTimeChange(event: DateTimePickerEvent, selected?: Date) {
    setShowTimePicker(false);
    if (event.type === "set" && selected) {
      setTimeValue(selected);
      setTime(toTimeString(selected));
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    // JIT: only now, on a deliberate confirm, do we fire the OS prompt. The date
    // is saved regardless of the answer — the schedule simply waits for
    // permission if it's declined.
    await requestNotificationPermission().catch(() => false);
    setSubmitting(false);
    onConfirm(toDateString(date), time);
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.four),
            },
          ]}
        >
          <View style={styles.handleRow}>
            <View
              style={[styles.handle, { backgroundColor: theme.backgroundSelected }]}
            />
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View
            style={[styles.iconBadge, { backgroundColor: theme.backgroundElement }]}
          >
            <Ionicons name="notifications" size={26} color={theme.primary} />
          </View>

          <ThemedText type="subtitle">{t("reminder.modal.title")}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t("reminder.modal.subtitle", { tour: tourTitle })}
          </ThemedText>

          <View style={styles.field}>
            <ThemedText type="smallBold">{t("reminder.modal.dateLabel")}</ThemedText>
            {Platform.OS === "ios" ? null : (
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.pickerButton, { borderColor: theme.backgroundSelected }]}
              >
                <Ionicons name="calendar" size={18} color={theme.primary} />
                <ThemedText type="small">{dateLabel}</ThemedText>
              </Pressable>
            )}
            {showDatePicker ? (
              <DateTimePicker
                value={date}
                mode="date"
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            ) : null}
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold">{t("reminder.modal.timeLabel")}</ThemedText>
            <View style={styles.timeRow}>
              <Pressable
                onPress={() => setShowTimePicker(true)}
                style={[styles.pickerButton, { borderColor: theme.backgroundSelected }]}
              >
                <Ionicons name="time" size={18} color={theme.primary} />
                <ThemedText type="small">{time ?? "—"}</ThemedText>
              </Pressable>
              {time ? (
                <Pressable
                  onPress={() => setTime(null)}
                  style={styles.clearTime}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>
            {showTimePicker ? (
              <DateTimePicker
                value={timeValue}
                mode="time"
                onChange={onTimeChange}
              />
            ) : null}
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            {t("reminder.modal.permissionNote")}
          </ThemedText>

          <GoldGradientButton
            label={t("reminder.modal.confirm")}
            icon="notifications"
            fullWidth
            onPress={submitting ? () => undefined : handleConfirm}
          />

          <Pressable onPress={onSkip} style={styles.skipButton}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t("reminder.modal.skip")}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  handleRow: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: Spacing.one,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    gap: Spacing.two,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: "flex-start",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  clearTime: {
    padding: Spacing.one,
  },
  skipButton: {
    alignSelf: "center",
    paddingVertical: Spacing.two,
  },
});

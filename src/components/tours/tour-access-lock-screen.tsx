import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { TourLockReason } from "@/hooks/use-entitlement-status";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";

type TourAccessLockScreenProps = {
  tourTitle?: string;
  reason: TourLockReason;
};

export function TourAccessLockScreen({
  tourTitle,
  reason,
}: TourAccessLockScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();

  const title =
    reason === "tour_not_entitled"
      ? t("accessLock.tourNotIncluded")
      : t("accessLock.accessInactive");

  const message =
    reason === "tour_not_entitled"
      ? t("accessLock.tourNotIncludedHint")
      : t("accessLock.accessInactiveHint");

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.content}>
          <ScreenHeader title={tourTitle ?? t("accessLock.title")} />

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
          >
            <Ionicons name="lock-closed" size={32} color={theme.primary} />
            <ThemedText type="subtitle" style={styles.lockTitle}>
              {title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>

            {reason === "access_inactive" ? (
              <Pressable
                onPress={() => router.navigate("/subscribe")}
                style={[styles.button, { backgroundColor: theme.primary }]}
              >
                <Ionicons
                  name="card-outline"
                  size={18}
                  color={theme.primaryForeground}
                />
                <ThemedText type="smallBold" style={{ color: theme.primaryForeground }}>
                  {t("accessLock.subscribe")}
                </ThemedText>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => router.navigate("/explore")}
              style={[styles.button, { backgroundColor: theme.primary }]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={theme.primaryForeground}
              />
              <ThemedText type="smallBold" style={{ color: theme.primaryForeground }}>
                {t("accessLock.openAccount")}
              </ThemedText>
            </Pressable>

            <Pressable onPress={() => router.back()} style={styles.textButton}>
              <Ionicons name="arrow-back" size={16} color={theme.primary} />
              <ThemedText type="linkPrimary">{t("accessLock.goBack")}</ThemedText>
            </Pressable>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.five,
    gap: Spacing.three,
    alignItems: "center",
  },
  lockTitle: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
  },
  button: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  textButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
});

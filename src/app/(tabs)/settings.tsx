import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FeatureRow } from "@/components/home/feature-row";
import { HamburgerButton } from "@/components/navigation/hamburger-button";
import { AccessSettingsPanel } from "@/components/settings/access-settings-panel";
import { AppInfoSettingsPanel } from "@/components/settings/app-info-settings-panel";
import { LanguageSettingsPanel } from "@/components/settings/language-settings-panel";
import { StorageSettingsPanel } from "@/components/settings/storage-settings-panel";
import { ThemeSettingsPanel } from "@/components/settings/theme-settings-panel";
import { TourDateSettingsPanel } from "@/components/settings/tour-date-settings-panel";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useEntitlementStatus } from "@/hooks/use-entitlement-status";
import { useStrings } from "@/hooks/use-strings";

export default function SettingsScreen() {
  const { t } = useStrings();
  const { hasActivePlan, entitlements } = useEntitlementStatus();
  const hostTourId = entitlements?.tours[0]?.id;

  return (
    <ThemedView transparent style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <HamburgerButton />
          <View style={styles.headerText}>
            <ThemedText type="subtitle">{t("settings.title")}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t("settings.subtitle")}
            </ThemedText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AccessSettingsPanel />
          {hostTourId ? (
            <FeatureRow tourId={hostTourId} locked={!hasActivePlan} />
          ) : null}
          <TourDateSettingsPanel />
          <ThemeSettingsPanel />
          <LanguageSettingsPanel />
          <StorageSettingsPanel />
          <AppInfoSettingsPanel />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
});

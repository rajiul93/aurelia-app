import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { AccessSettingsPanel } from "@/components/settings/access-settings-panel";
import { AppInfoSettingsPanel } from "@/components/settings/app-info-settings-panel";
import { LanguageSettingsPanel } from "@/components/settings/language-settings-panel";
import { StorageSettingsPanel } from "@/components/settings/storage-settings-panel";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";

export default function SettingsScreen() {
  const { t } = useStrings();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={t("settings.title")}
            subtitle={t("settings.subtitle")}
          />

          <AccessSettingsPanel />
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
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
});

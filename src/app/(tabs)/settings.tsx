import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HamburgerButton } from "@/components/navigation/hamburger-button";
import { AccessSettingsPanel } from "@/components/settings/access-settings-panel";
import { AppInfoSettingsPanel } from "@/components/settings/app-info-settings-panel";
import { LanguageSettingsPanel } from "@/components/settings/language-settings-panel";
import { StorageSettingsPanel } from "@/components/settings/storage-settings-panel";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";

export default function SettingsScreen() {
  const { t } = useStrings();

  return (
    <ThemedView style={styles.container}>
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

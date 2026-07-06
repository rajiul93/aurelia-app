import { ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountPanel } from "@/components/auth/account-panel";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";

export default function AccountScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="subtitle" style={styles.title}>
            {t("account.title")}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {t("account.subtitle")}
          </ThemedText>

          <AccountPanel />

          <Pressable
            onPress={() => router.push("/settings")}
            style={[
              styles.settingsLink,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <ThemedText type="smallBold">{t("account.storageSettings")}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t("account.storageSettingsHint")}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  title: {
    paddingTop: Spacing.three,
    alignSelf: "stretch",
  },
  subtitle: {
    alignSelf: "stretch",
    flexShrink: 1,
  },
  settingsLink: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
});

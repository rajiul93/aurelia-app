import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useKnowledgePage } from "@/hooks/use-knowledge";
import { useStrings } from "@/hooks/use-strings";

export default function ContentPageScreen() {
  const router = useRouter();
  const { t } = useStrings();
  const { key } = useLocalSearchParams<{ key: string }>();
  const page = useKnowledgePage(key ?? "");

  return (
    <ThemedView transparent style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={page?.title ?? t("drawer.menu")}
            onBack={() => router.back()}
          />

          {page ? (
            <ThemedText type="default" style={styles.body}>
              {page.bodyText}
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {t("pages.notFound")}
            </ThemedText>
          )}
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
    gap: Spacing.four,
  },
  body: {
    lineHeight: 24,
  },
});

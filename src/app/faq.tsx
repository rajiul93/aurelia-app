import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { FaqAccordion } from "@/components/tours/faq-accordion";
import { Spacing } from "@/constants/theme";
import { useKnowledgeFaqs } from "@/hooks/use-knowledge";
import { useStrings } from "@/hooks/use-strings";

export default function FaqScreen() {
  const router = useRouter();
  const { t } = useStrings();
  const faqs = useKnowledgeFaqs();

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { question: string; answer: string; id: string }[]
    >();

    for (const faq of faqs) {
      const key = faq.categoryTitle || t("faqScreen.title");
      const list = map.get(key) ?? [];
      list.push({ id: faq.id, question: faq.question, answer: faq.answerText });
      map.set(key, list);
    }

    return [...map.entries()];
  }, [faqs, t]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={t("faqScreen.title")}
            subtitle={t("faqScreen.subtitle")}
            onBack={() => router.back()}
          />

          {grouped.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t("faqScreen.empty")}
            </ThemedText>
          ) : (
            grouped.map(([category, items]) => (
              <FaqAccordion key={category} title={category} items={items} />
            ))
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
});

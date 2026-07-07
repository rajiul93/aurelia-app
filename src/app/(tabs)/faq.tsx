import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HamburgerButton } from "@/components/navigation/hamburger-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { FaqAccordion } from "@/components/tours/faq-accordion";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useKnowledgeFaqs } from "@/hooks/use-knowledge";
import { useStrings } from "@/hooks/use-strings";

export default function FaqScreen() {
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
        <View style={styles.header}>
          <HamburgerButton />
          <View style={styles.headerText}>
            <ThemedText type="subtitle">{t("faqScreen.title")}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t("faqScreen.subtitle")}
            </ThemedText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
    gap: Spacing.four,
  },
});

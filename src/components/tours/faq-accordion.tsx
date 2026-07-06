import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type FaqItem = {
  id: string;
  question: string;
  answer?: string;
};

type FaqAccordionProps = {
  title: string;
  items: FaqItem[];
  onDark?: boolean;
};

export function FaqAccordion({ title, items, onDark = false }: FaqAccordionProps) {
  const theme = useTheme();
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return null;
  }

  const questionColor = onDark ? "#ffffff" : theme.text;
  const answerColor = onDark ? "rgba(255,255,255,0.75)" : theme.textSecondary;
  const cardBg = onDark ? "rgba(255,255,255,0.08)" : theme.backgroundElement;

  return (
    <View style={styles.section}>
      <ThemedText
        type="smallBold"
        style={{ color: onDark ? theme.primary : theme.text }}
      >
        {title}
      </ThemedText>

      {items.map((item) => {
        const open = openId === item.id;

        return (
          <View
            key={item.id}
            style={[styles.card, { backgroundColor: cardBg }]}
          >
            <Pressable
              onPress={() => setOpenId(open ? null : item.id)}
              style={styles.questionRow}
            >
              <ThemedText
                type="smallBold"
                style={[styles.question, { color: questionColor }]}
              >
                {item.question}
              </ThemedText>
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={18}
                color={onDark ? theme.primary : theme.textSecondary}
              />
            </Pressable>

            {open && item.answer ? (
              <ThemedText
                type="small"
                style={[styles.answer, { color: answerColor }]}
              >
                {item.answer}
              </ThemedText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: "stretch",
    gap: Spacing.two,
  },
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  question: {
    flex: 1,
  },
  answer: {
    alignSelf: "stretch",
  },
});

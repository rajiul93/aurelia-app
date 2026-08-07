import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { GlassCard } from "@/components/ui/glass-card";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useKnowledgeStore } from "@/store/knowledge-store";

export function KnowledgeSettingsPanel() {
  const theme = useTheme();
  const { t } = useStrings();
  const [feedbackState, setFeedbackState] = useState<"idle" | "success" | "error">("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sync = useKnowledgeStore((state) => state.sync);
  const pack = useKnowledgeStore((state) => state.pack);

  async function handleRefresh() {
    setIsRefreshing(true);
    const success = await sync();
    setIsRefreshing(false);
    setFeedbackState(success ? "success" : "error");

    // Clear feedback after 3 seconds
    setTimeout(() => setFeedbackState("idle"), 3000);
  }

  if (!pack) {
    return null;
  }

  return (
    <GlassCard>
      <ThemedText type="smallBold">{t("settings.knowledgeBase")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("settings.knowledgeBaseHint")}
      </ThemedText>

      <Pressable
        disabled={isRefreshing}
        onPress={handleRefresh}
        style={[
          styles.refreshButton,
          { borderColor: theme.backgroundSelected },
        ]}
      >
        {isRefreshing ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <>
            <Ionicons name="refresh" size={16} color={theme.text} />
            <ThemedText type="smallBold">{t("settings.refreshKnowledgeBase")}</ThemedText>
          </>
        )}
      </Pressable>

      {feedbackState === "success" && (
        <ThemedText type="small" themeColor="primary" style={styles.feedback}>
          {t("settings.knowledgeRefreshed")}
        </ThemedText>
      )}
      {feedbackState === "error" && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.feedback}>
          {t("settings.knowledgeRefreshFailed")}
        </ThemedText>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
    minWidth: 140,
  },
  feedback: {
    marginTop: Spacing.two,
  },
});

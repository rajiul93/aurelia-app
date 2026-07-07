import { type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useKnowledgeStore } from "@/store/knowledge-store";

type KnowledgeGateProps = {
  children: ReactNode;
};

/**
 * On first launch (no cached pack yet) we briefly block while the encrypted
 * offline content downloads. Once a pack is cached — or the first download
 * finishes/fails — the app renders and future syncs happen in the background.
 */
export function KnowledgeGate({ children }: KnowledgeGateProps) {
  const theme = useTheme();
  const { t } = useStrings();
  const hydrated = useKnowledgeStore((state) => state.hydrated);
  const pack = useKnowledgeStore((state) => state.pack);
  const status = useKnowledgeStore((state) => state.status);

  const firstDownloadInFlight =
    hydrated && !pack && (status === "idle" || status === "loading");

  if (!hydrated || firstDownloadInFlight) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          {t("knowledge.preparing")}
        </ThemedText>
      </ThemedView>
    );
  }

  return <View style={styles.flex}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
  },
  label: {
    textAlign: "center",
  },
});

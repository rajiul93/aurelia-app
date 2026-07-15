import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { GlassCard } from "@/components/ui/glass-card";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useRemoteConfig } from "@/store/release-config-store";

export function EmergencyAnnouncementBanner() {
  const theme = useTheme();
  const { t } = useStrings();
  const remote = useRemoteConfig();
  const message = remote.emergencyAnnouncement?.trim();

  if (!message) {
    return null;
  }

  return (
    <GlassCard style={[styles.banner, { borderColor: theme.primary }]}>
      <ThemedText type="smallBold" themeColor="primary">
        {t("home.announcement")}
      </ThemedText>
      <ThemedText type="small" style={styles.message}>
        {message}
      </ThemedText>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  message: {
    alignSelf: "stretch",
  },
});

import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
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
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.primary,
        },
      ]}
    >
      <ThemedText type="smallBold" themeColor="primary">
        {t("home.announcement")}
      </ThemedText>
      <ThemedText type="small" style={styles.message}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  message: {
    alignSelf: "stretch",
  },
});

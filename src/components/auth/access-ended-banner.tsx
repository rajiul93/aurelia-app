import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth-store";

export function AccessEndedBanner() {
  const theme = useTheme();
  const { t } = useStrings();
  const accessEndedReason = useAuthStore((state) => state.accessEndedReason);
  const clearAccessEndedReason = useAuthStore(
    (state) => state.clearAccessEndedReason,
  );

  if (accessEndedReason !== "session_expired") {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: `${theme.primary}18`,
          borderColor: theme.primary,
        },
      ]}
    >
      <Ionicons name="alert-circle" size={20} color={theme.primary} />
      <View style={styles.copy}>
        <ThemedText type="smallBold">{t("accessEnded.title")}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("accessEnded.message")}
        </ThemedText>
      </View>
      <Pressable
        accessibilityLabel={t("accessEnded.dismiss")}
        onPress={clearAccessEndedReason}
        hitSlop={8}
      >
        <Ionicons name="close" size={20} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
});

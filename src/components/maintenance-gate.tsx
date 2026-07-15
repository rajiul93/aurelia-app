import { Ionicons } from "@react-native-vector-icons/ionicons";
import { usePathname, useRouter } from "expo-router";
import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useRemoteConfig } from "@/store/release-config-store";

type MaintenanceGateProps = {
  children: ReactNode;
};

export function MaintenanceGate({ children }: MaintenanceGateProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useStrings();
  const remote = useRemoteConfig();
  const onSettings = pathname === "/settings";

  if (!remote.maintenanceMode || onSettings) {
    return children;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="subtitle">{t("maintenance.title")}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            {remote.maintenanceMessage ?? t("maintenance.message")}
          </ThemedText>
          <Pressable
            onPress={() => router.push("/settings")}
            style={[styles.button, { backgroundColor: theme.primary }]}
          >
            <Ionicons
              name="settings-outline"
              size={18}
              color={theme.primaryForeground}
            />
            <ThemedText
              type="smallBold"
              style={{ color: theme.primaryForeground }}
            >
              {t("maintenance.openSettings")}
            </ThemedText>
          </Pressable>
        </View>
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
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  message: {
    alignSelf: "stretch",
  },
  button: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});

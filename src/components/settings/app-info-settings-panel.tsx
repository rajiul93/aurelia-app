import Constants from "expo-constants";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";

function getAppVersion() {
  return Constants.expoConfig?.version ?? "1.0.0";
}

function getBuildNumber() {
  const iosBuild = Constants.expoConfig?.ios?.buildNumber;
  const androidBuild = Constants.expoConfig?.android?.versionCode;

  if (iosBuild) {
    return String(iosBuild);
  }

  if (androidBuild) {
    return String(androidBuild);
  }

  return null;
}

export function AppInfoSettingsPanel() {
  const theme = useTheme();
  const { t } = useStrings();
  const version = getAppVersion();
  const build = getBuildNumber();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement },
      ]}
    >
      <ThemedText type="smallBold">{t("settings.appInfo")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("settings.appVersion", { version })}
        {build ? ` (${build})` : ""}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});

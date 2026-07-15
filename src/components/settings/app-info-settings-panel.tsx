import Constants from "expo-constants";

import { ThemedText } from "@/components/themed-text";
import { GlassCard } from "@/components/ui/glass-card";
import { useStrings } from "@/hooks/use-strings";

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
  const { t } = useStrings();
  const version = getAppVersion();
  const build = getBuildNumber();

  return (
    <GlassCard>
      <ThemedText type="smallBold">{t("settings.appInfo")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("settings.appVersion", { version })}
        {build ? ` (${build})` : ""}
      </ThemedText>
    </GlassCard>
  );
}

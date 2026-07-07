import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useThemeStore, type ThemeMode } from "@/store/theme-store";

const MODES: ThemeMode[] = ["system", "light", "dark"];

export function ThemeSettingsPanel() {
  const theme = useTheme();
  const { t } = useStrings();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  const label: Record<ThemeMode, string> = {
    system: t("settings.themeSystem"),
    light: t("settings.themeLight"),
    dark: t("settings.themeDark"),
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">{t("settings.theme")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("settings.themeHint")}
      </ThemedText>
      <View style={styles.row}>
        {MODES.map((item) => {
          const active = item === mode;

          return (
            <Pressable
              key={item}
              onPress={() => void setMode(item)}
              style={[
                styles.chip,
                {
                  backgroundColor: active
                    ? theme.primary
                    : theme.backgroundSelected,
                },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: active ? theme.primaryForeground : theme.text }}
              >
                {label[item]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
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
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

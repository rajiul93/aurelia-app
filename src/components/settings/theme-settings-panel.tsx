import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { GlassCard } from "@/components/ui/glass-card";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useThemeStore, type ThemeMode } from "@/store/theme-store";

const MODES: ThemeMode[] = ["system", "light", "dark"];

const MODE_ICONS: Record<
  ThemeMode,
  ComponentProps<typeof Ionicons>["name"]
> = {
  system: "phone-portrait-outline",
  light: "sunny-outline",
  dark: "moon-outline",
};

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
    <GlassCard>
      <ThemedText type="smallBold">{t("settings.theme")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("settings.themeHint")}
      </ThemedText>
      <View style={styles.row}>
        {MODES.map((item) => {
          const active = item === mode;
          const color = active ? theme.primaryForeground : theme.text;

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
              <Ionicons name={MODE_ICONS[item]} size={14} color={color} />
              <ThemedText type="smallBold" style={{ color }}>
                {label[item]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

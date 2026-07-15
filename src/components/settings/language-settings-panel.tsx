import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useRemoteConfig } from "@/store/release-config-store";
import { useLocaleStore, type AppLanguage } from "@/store/locale-store";

const ALL_LANGUAGES: AppLanguage[] = ["en", "es", "fr"];

export function LanguageSettingsPanel() {
  const theme = useTheme();
  const { t, languageLabel } = useStrings();
  const remote = useRemoteConfig();
  const language = useLocaleStore((state) => state.language);
  const setLanguage = useLocaleStore((state) => state.setLanguage);
  const languages = ALL_LANGUAGES.filter((item) =>
    remote.supportedLanguages.includes(item),
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement },
      ]}
    >
      <ThemedText type="smallBold">{t("settings.language")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("settings.languageHint")}
      </ThemedText>
      <View style={styles.languageRow}>
        {languages.map((item) => {
          const active = item === language;
          const color = active ? theme.primaryForeground : theme.text;

          return (
            <Pressable
              key={item}
              onPress={() => void setLanguage(item)}
              style={[
                styles.languageChip,
                {
                  backgroundColor: active
                    ? theme.primary
                    : theme.backgroundSelected,
                },
              ]}
            >
              <Ionicons name="language-outline" size={14} color={color} />
              <ThemedText type="smallBold" style={{ color }}>
                {languageLabel(item)}
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
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  languageChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

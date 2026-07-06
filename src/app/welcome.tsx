import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PageBackground } from "@/components/page-background";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useAppContent } from "@/hooks/queries/use-app-content";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import {
  resolveAppAssetUrl,
  resolveAppBackgroundUrl,
} from "@/lib/app-content/resolve-asset";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useLocaleStore, type AppLanguage } from "@/store/locale-store";
import { useReleaseConfigStore } from "@/store/release-config-store";

export default function WelcomeScreen() {
  const theme = useTheme();
  const { t, languageLabel } = useStrings();
  const language = useLocaleStore((state) => state.language);
  const setLanguage = useLocaleStore((state) => state.setLanguage);
  const markComplete = useOnboardingStore((state) => state.markComplete);
  const supportedLanguages = useReleaseConfigStore(
    (state) => state.config.remote.supportedLanguages,
  );
  const { data: contentResponse } = useAppContent();
  const assets = contentResponse?.data.assets;
  const backgroundUrl = resolveAppBackgroundUrl(assets);
  const logoUrl = resolveAppAssetUrl(assets, "logo");

  const languages = (["en", "es", "fr"] as AppLanguage[]).filter((code) =>
    supportedLanguages.includes(code),
  );

  async function handleGetStarted() {
    await markComplete();
  }

  return (
    <PageBackground uri={backgroundUrl} imagePosition="right">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={styles.logo}
                contentFit="contain"
              />
            ) : (
              <ThemedText type="title" themeColor="primary" style={styles.brand}>
                {t("app.name")}
              </ThemedText>
            )}
            <ThemedText type="title" style={styles.headline}>
              {t("welcome.title.line1")}
            </ThemedText>
            <ThemedText type="title" style={styles.headline}>
              {t("welcome.title.line2")}
            </ThemedText>
            <ThemedText type="subtitle" themeColor="primary">
              {t("welcome.title.highlight")}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subcopy}>
              {t("welcome.description")}
            </ThemedText>
          </View>

          <View style={styles.languageBlock}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>
              {t("welcome.languageLabel")}
            </ThemedText>
            <View style={styles.languageRow}>
              {languages.map((code) => {
                const active = code === language;

                return (
                  <Pressable
                    key={code}
                    onPress={() => void setLanguage(code)}
                    style={[
                      styles.languageChip,
                      {
                        borderColor: active ? theme.primary : theme.backgroundSelected,
                        backgroundColor: active
                          ? `${theme.primary}22`
                          : theme.backgroundElement,
                      },
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: active ? theme.primary : theme.text }}
                    >
                      {languageLabel(code)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            onPress={() => void handleGetStarted()}
            style={[styles.cta, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="smallBold" style={{ color: theme.primaryForeground }}>
              {t("welcome.getStarted")}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.five,
  },
  hero: {
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  brand: {
    fontSize: 42,
    lineHeight: 48,
    marginBottom: Spacing.three,
  },
  logo: {
    width: 200,
    height: 120,
    marginBottom: Spacing.three,
  },
  headline: {
    lineHeight: 36,
  },
  subcopy: {
    marginTop: Spacing.two,
    maxWidth: 320,
    lineHeight: 22,
  },
  languageBlock: {
    gap: Spacing.two,
  },
  sectionLabel: {
    marginBottom: Spacing.one,
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  languageChip: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  cta: {
    alignItems: "center",
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
  },
});

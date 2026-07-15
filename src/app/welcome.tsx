import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useAppContent } from "@/hooks/queries/use-app-content";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { resolveAppAssetUrl } from "@/lib/app-content/resolve-asset";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useLocaleStore, type AppLanguage } from "@/store/locale-store";
import { useReleaseConfigStore } from "@/store/release-config-store";

const LIGHT_DRIFT = Easing.inOut(Easing.sin);

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
  const logoUrl = resolveAppAssetUrl(assets, "logo");

  // Soft “light drift” — long sine loops so it feels like ambient light, not a blink
  const drift = useSharedValue(0);
  const breath = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 10000, easing: LIGHT_DRIFT }),
      -1,
      true,
    );
    breath.value = withRepeat(
      withTiming(1, { duration: 7000, easing: LIGHT_DRIFT }),
      -1,
      true,
    );
  }, [drift, breath]);

  const ambientLightStyle = useAnimatedStyle(() => {
    const x = interpolate(drift.value, [0, 1], [-36, 44]);
    const y = interpolate(drift.value, [0, 1], [10, -18]);
    const scale = interpolate(breath.value, [0, 1], [0.92, 1.08]);
    const opacity = interpolate(breath.value, [0, 1], [0.35, 0.55]);

    return {
      opacity,
      transform: [{ translateX: x }, { translateY: y }, { scale }],
    };
  });

  const languages = (["en", "es", "fr"] as AppLanguage[]).filter((code) =>
    supportedLanguages.includes(code),
  );

  async function handleGetStarted() {
    await markComplete();
  }

  return (
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
            <ThemedText type="title" style={[styles.brand, styles.brandText]}>
              {t("app.name")}
            </ThemedText>
          )}

          <View style={styles.titleBlock}>
            <Animated.View
              pointerEvents="none"
              style={[styles.ambientLightWrap, ambientLightStyle]}
            >
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0.22)",
                  "rgba(255,255,255,0.08)",
                  "rgba(255,255,255,0.0)",
                ]}
                locations={[0, 0.42, 1]}
                start={{ x: 0.25, y: 0.15 }}
                end={{ x: 0.85, y: 0.95 }}
                style={styles.ambientLight}
              />
            </Animated.View>
            <ThemedText type="title" style={[styles.headline, styles.headlineText]}>
              {t("welcome.title.line1")}
            </ThemedText>
            <ThemedText type="title" style={[styles.headline, styles.headlineText]}>
              {t("welcome.title.line2")}
            </ThemedText>
            <ThemedText
              type="subtitle"
              style={[styles.highlight, styles.headlineText]}
            >
              {t("welcome.title.highlight")}
            </ThemedText>
          </View>

          <ThemedText style={[styles.subcopy, styles.onDarkMuted]}>
            {t("welcome.description")}
          </ThemedText>
        </View>

        <View style={styles.languageBlock}>
          <ThemedText type="smallBold" style={[styles.sectionLabel, styles.onDarkText]}>
            {t("welcome.languageLabel")}
          </ThemedText>
          <View style={styles.languageRow}>
            {languages.map((code) => {
              const active = code === language;

              return (
                <Pressable
                  key={code}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => void setLanguage(code)}
                  style={[
                    styles.languageChip,
                    active
                      ? styles.languageChipActive
                      : styles.languageChipInactive,
                  ]}
                >
                  {active ? (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    </View>
                  ) : (
                    <Ionicons
                      name="language-outline"
                      size={14}
                      color="rgba(255,255,255,0.7)"
                    />
                  )}
                  <ThemedText
                    type="smallBold"
                    style={
                      active
                        ? styles.languageLabelActive
                        : styles.languageLabelInactive
                    }
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
          <ThemedText
            type="smallBold"
            style={{ color: theme.primaryForeground }}
          >
            {t("welcome.getStarted")}
          </ThemedText>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={theme.primaryForeground}
          />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
  brandText: {
    color: "#0c0a09",
  },
  logo: {
    width: 200,
    height: 120,
    marginBottom: Spacing.three,
  },
  titleBlock: {
    position: "relative",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    overflow: "visible",
  },
  ambientLightWrap: {
    position: "absolute",
    left: -40,
    top: -10,
    width: 320,
    height: 200,
  },
  ambientLight: {
    width: "100%",
    height: "100%",
    borderRadius: 160,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  headlineText: {
    color: "#ffffff",
  },
  highlight: {
    marginTop: Spacing.one,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.2,
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
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    minWidth: 96,
  },
  languageChipInactive: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(12, 10, 9, 0.62)",
  },
  languageChipActive: {
    borderColor: "#ffffff",
    backgroundColor: "#ffffff",
  },
  languageLabelActive: {
    color: "#0c0a09",
  },
  languageLabelInactive: {
    color: "#ffffff",
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0c0a09",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
  },
  onDarkText: {
    color: "#ffffff",
  },
  onDarkMuted: {
    color: "rgba(255, 255, 255, 0.88)",
  },
});

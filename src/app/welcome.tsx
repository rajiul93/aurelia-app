import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { GoldGradientButton } from "@/components/ui/gold-gradient-button";
import { Fonts, Spacing } from "@/constants/theme";
import { useAppContent } from "@/hooks/queries/use-app-content";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { resolveAppAssetUrl } from "@/lib/app-content/resolve-asset";
import { GoldGradientHorizontal } from "@/theme/gradients";
import { useOnboardingStore } from "@/store/onboarding-store";
import {
  APP_LANGUAGES,
  useLocaleStore,
  type AppLanguage,
} from "@/store/locale-store";
import { useReleaseConfigStore } from "@/store/release-config-store";

const LIGHT_DRIFT = Easing.inOut(Easing.sin);

/**
 * Welcome is intentionally non-scrolling: hero + up to 4 languages + CTA
 * must fit a typical phone viewport. Keep paddings compact when adding a language.
 */
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

  const languages = APP_LANGUAGES.filter((code) =>
    supportedLanguages.includes(code),
  );

  async function handleGetStarted() {
    await markComplete();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.55)"]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Fixed layout — no ScrollView so a 4th language still fits on-screen */}
      <View style={styles.screen}>
        <Animated.View
          entering={FadeInDown.delay(40).duration(520).springify().damping(18)}
          style={styles.hero}
        >
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

          <View style={[styles.goldRule, { backgroundColor: theme.primary }]} />

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
            <ThemedText style={[styles.headline, styles.headlineText]}>
              {t("welcome.title.line1")}
            </ThemedText>
            <ThemedText style={[styles.headline, styles.headlineText]}>
              {t("welcome.title.line2")}
            </ThemedText>
            <ThemedText style={[styles.highlight, styles.headlineText]}>
              {t("welcome.title.highlight")}
            </ThemedText>
          </View>

          <ThemedText
            numberOfLines={2}
            style={[styles.subcopy, styles.onDarkMuted]}
          >
            {t("welcome.description")}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(160).duration(520).springify().damping(18)}
          style={styles.languageBlock}
        >
          <View style={styles.languageHeader}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>
              {t("welcome.languageLabel").toLocaleUpperCase("en-US")}
            </ThemedText>
            <View
              style={[styles.sectionRule, { backgroundColor: theme.primary }]}
            />
          </View>

          <View style={styles.languagePanel}>
            {languages.map((code, index) => {
              const active = code === language;
              const isLast = index === languages.length - 1;

              return (
                <View key={code}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    android_ripple={{
                      color: "rgba(255,255,255,0.08)",
                      borderless: false,
                      foreground: true,
                    }}
                    onPress={() => void setLanguage(code)}
                    style={({ pressed }) => [
                      styles.languageOption,
                      pressed && !active && styles.languageOptionPressed,
                    ]}
                  >
                    {active ? (
                      <LinearGradient
                        {...GoldGradientHorizontal}
                        style={styles.languageOptionActive}
                      >
                        <View style={styles.languageCodeBadgeActive}>
                          <ThemedText
                            type="smallBold"
                            style={styles.languageCodeActive}
                          >
                            {code.toUpperCase()}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="smallBold"
                          style={styles.languageNameActive}
                        >
                          {languageLabel(code as AppLanguage)}
                        </ThemedText>
                        <View style={styles.checkBadgeActive}>
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={theme.primary}
                          />
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={styles.languageOptionIdle}>
                        <View style={styles.languageCodeBadge}>
                          <ThemedText
                            type="smallBold"
                            style={styles.languageCode}
                          >
                            {code.toUpperCase()}
                          </ThemedText>
                        </View>
                        <ThemedText type="smallBold" style={styles.languageName}>
                          {languageLabel(code as AppLanguage)}
                        </ThemedText>
                        <View style={styles.radioIdle} />
                      </View>
                    )}
                  </Pressable>
                  {!isLast ? <View style={styles.languageDivider} /> : null}
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(260).duration(520).springify().damping(18)}
          style={styles.ctaWrap}
        >
          <GoldGradientButton
            label={t("welcome.getStarted")}
            onPress={() => void handleGetStarted()}
            showArrow
            fullWidth
            style={styles.ctaButton}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    gap: Spacing.one,
    flexShrink: 1,
  },
  brand: {
    fontSize: 34,
    lineHeight: 40,
    marginBottom: Spacing.one,
  },
  brandText: {
    color: "#0c0a09",
  },
  logo: {
    width: 160,
    height: 72,
    marginBottom: Spacing.one,
  },
  goldRule: {
    width: 32,
    height: 2,
    borderRadius: 999,
    marginVertical: Spacing.one,
    opacity: 0.9,
  },
  titleBlock: {
    position: "relative",
    gap: 2,
    paddingVertical: Spacing.one,
    overflow: "visible",
  },
  ambientLightWrap: {
    position: "absolute",
    left: -40,
    top: -10,
    width: 300,
    height: 150,
  },
  ambientLight: {
    width: "100%",
    height: "100%",
    borderRadius: 160,
  },
  headline: {
    fontFamily: Fonts.sansBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  headlineText: {
    color: "#ffffff",
  },
  highlight: {
    marginTop: 2,
    fontFamily: Fonts.sansBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  subcopy: {
    marginTop: Spacing.two,
    maxWidth: 300,
    fontSize: 13,
    lineHeight: 18,
  },
  languageBlock: {
    gap: Spacing.two,
    flexShrink: 0,
  },
  languageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
  },
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.55,
  },
  languagePanel: {
    borderRadius: 28,
    overflow: "hidden",
    padding: Spacing.two + 2,
    backgroundColor: "rgba(12, 10, 9, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(225, 165, 102, 0.28)",
  },
  languageOption: {
    borderRadius: 22,
    overflow: "hidden",
  },
  languageOptionPressed: {
    opacity: 0.88,
  },
  languageOptionActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three + 2,
    borderRadius: 22,
  },
  languageOptionIdle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three + 2,
    borderRadius: 22,
    backgroundColor: "transparent",
  },
  languageCodeBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  languageCodeBadgeActive: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(26, 18, 8, 0.22)",
  },
  languageCode: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  languageCodeActive: {
    color: "#1a1208",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  languageName: {
    flex: 1,
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
  },
  languageNameActive: {
    flex: 1,
    color: "#1a1208",
    fontSize: 15,
  },
  radioIdle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
  },
  checkBadgeActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1208",
  },
  languageDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: Spacing.three,
  },
  ctaWrap: {
    alignSelf: "stretch",
    flexShrink: 0,
  },
  ctaButton: {
    alignSelf: "stretch",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#e1a566",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  onDarkMuted: {
    color: "rgba(255, 255, 255, 0.78)",
  },
});

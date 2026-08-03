import type { ComponentProps, ReactNode } from "react";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { GlassCard } from "@/components/ui/glass-card";
import { ScreenHeader } from "@/components/screen-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TourAccessLockScreen } from "@/components/tours/tour-access-lock-screen";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  AUDIENCE_TYPES,
  DEFAULT_AUDIENCE,
  type AudienceType,
} from "@/constants/audiences";
import {
  DEFAULT_DOWNLOAD_MODE,
  DOWNLOAD_MODES,
  type DownloadMode,
} from "@/constants/download-mode";
import { Spacing } from "@/constants/theme";
import { useDownloadTour } from "@/hooks/mutations/use-download-tour";
import { useAppContent } from "@/hooks/queries/use-app-content";
import { useEntitlementStatus } from "@/hooks/use-entitlement-status";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getCurrentTimeOfDay,
  resolveAppBackgroundUrl,
} from "@/lib/app-content/resolve-asset";
import type { DownloadProgress } from "@/lib/bundle/download-progress";
import {
  formatDownloadPercent,
  getDownloadProgressLabel,
} from "@/lib/bundle/download-progress-label";
import { useLocaleStore, APP_LANGUAGES, type AppLanguage } from "@/store/locale-store";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import {
  useReleaseConfigStore,
  useRemoteConfig,
} from "@/store/release-config-store";

export function TourPrepareScreen() {
  const { tourId, slug, title, mode } = useLocalSearchParams<{
    tourId: string;
    slug: string;
    title: string;
    mode?: string;
  }>();
  const { getTourLockReason } = useEntitlementStatus();
  const installed = useInstalledToursStore(
    (state) => state.installedByTourId[tourId ?? ""] ?? null,
  );
  const lockReason = tourId ? getTourLockReason(tourId) : "signed_out";

  if (lockReason) {
    return (
      <TourAccessLockScreen
        tourTitle={title ?? installed?.title}
        reason={lockReason}
      />
    );
  }

  if (!tourId || !slug || !title) {
    return null;
  }

  return (
    <TourPrepareForm
      tourId={tourId}
      slug={slug}
      title={title}
      mode={mode}
    />
  );
}

function TourPrepareForm({
  tourId,
  slug,
  title,
  mode,
}: {
  tourId: string;
  slug: string;
  title: string;
  mode?: string;
}) {
  const router = useRouter();
  const theme = useTheme();
  const {
    t,
    languageLabel,
    audienceLabel,
    downloadModeLabel,
    downloadModeDescription,
  } = useStrings();
  const installed = useInstalledToursStore(
    (state) => state.installedByTourId[tourId] ?? null,
  );
  const isUpdateMode = mode === "update" || Boolean(installed);
  const uiLanguage = useLocaleStore((state) => state.language);
  const supportedLanguages = useReleaseConfigStore(
    (state) => state.config.remote.supportedLanguages,
  );
  const downloadTour = useDownloadTour();

  // The header sits directly on the CMS background photo, with no card behind
  // it. Left on the theme colour it renders near-black over that photo and is
  // unreadable — so it switches to the white-on-dark treatment whenever a
  // background is actually active. Same derivation as subscribe.tsx.
  const { data: appContent } = useAppContent();
  const { venueTimezone } = useRemoteConfig();
  const heroOnDark = Boolean(
    resolveAppBackgroundUrl(
      appContent?.data.assets,
      getCurrentTimeOfDay(venueTimezone),
    ),
  );

  // State holds only what the user has actually picked; everything else is
  // derived. An installed tour's preferences arrive asynchronously, so an effect
  // used to copy them into state on arrival — which meant writing state on
  // render, and silently overwriting a choice the user made while the read was
  // still in flight. Falling back through installed → default instead keeps the
  // user's pick authoritative the moment they make it.
  const [audienceChoice, setAudienceChoice] = useState<AudienceType | null>(null);
  const [languageChoice, setLanguageChoice] = useState<AppLanguage | null>(null);
  const [downloadModeChoice, setDownloadModeChoice] =
    useState<DownloadMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(
    null,
  );

  const preferences = installed?.downloadPreferences;
  const audience =
    audienceChoice ?? preferences?.audience ?? DEFAULT_AUDIENCE;
  const contentLanguage =
    languageChoice ?? preferences?.contentLanguage ?? uiLanguage;
  const downloadMode =
    downloadModeChoice ?? preferences?.downloadMode ?? DEFAULT_DOWNLOAD_MODE;

  const languages = APP_LANGUAGES.filter((value) =>
    supportedLanguages.includes(value),
  );
  const isDownloading = downloadTour.isPending;
  const percent = downloadProgress
    ? formatDownloadPercent(downloadProgress)
    : 0;

  async function handleDownload() {
    setError(null);
    setDownloadProgress({ phase: "fetch", completed: 0, total: 1 });

    try {
      await downloadTour.mutateAsync({
        tourId,
        slug,
        title,
        preferences: {
          audience,
          contentLanguage,
          downloadMode,
        },
        onProgress: setDownloadProgress,
      });
      setDownloadProgress(null);
      router.replace(`/tour/${tourId}`);
    } catch (downloadError) {
      setDownloadProgress(null);
      setError(getApiErrorMessage(downloadError, t("download.failed")));
    }
  }

  return (
    <ThemedView transparent style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ScreenHeader
            onDark={heroOnDark}
            title={
              isUpdateMode ? t("prepare.updateTitle") : t("prepare.title")
            }
            subtitle={
              isUpdateMode && installed
                ? t("prepare.updateSubtitle", {
                    version: installed.tourBundleVersion,
                  })
                : t("prepare.subtitle")
            }
          />

          {!isDownloading ? (
            <GlassCard style={styles.selectionsCard}>
              <SelectionsGrid
                audience={audience}
                audienceLabel={audienceLabel}
                onAudienceChange={setAudienceChoice}
                contentLanguage={contentLanguage}
                languageLabel={languageLabel}
                languages={languages}
                onLanguageChange={setLanguageChoice}
                downloadMode={downloadMode}
                downloadModeLabel={downloadModeLabel}
                downloadModeDescription={downloadModeDescription}
                onDownloadModeChange={setDownloadModeChoice}
                t={t}
              />
            </GlassCard>
          ) : null}

          {isDownloading && downloadProgress ? (
            <View
              style={[
                styles.progressCard,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <View style={styles.progressHeader}>
                <ActivityIndicator color={theme.primary} />
                <ThemedText type="smallBold" style={styles.progressLabel}>
                  {getDownloadProgressLabel(t, downloadProgress)}
                </ThemedText>
              </View>
              <ProgressBar value={percent} />
              <ThemedText
                type="smallBold"
                themeColor="primary"
                style={styles.percentText}
              >
                {t("download.progressPercent", { percent })}
              </ThemedText>
            </View>
          ) : null}

          {error ? (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}

          {!isDownloading ? (
            <>
              <Pressable
                onPress={() => router.push(`/find-host/${tourId}`)}
                style={[styles.helpButton, { borderColor: theme.primary }]}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={18}
                  color={theme.primary}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Need Help at the Site?
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Find an Aurelia host on-site
                  </ThemedText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.primary}
                />
              </Pressable>

              <Pressable
                onPress={() => void handleDownload()}
                style={[styles.cta, { backgroundColor: theme.primary }]}
              >
                <NudgingCtaIcon
                  name={
                    isUpdateMode
                      ? "cloud-upload-outline"
                      : "cloud-download-outline"
                  }
                  color={theme.primaryForeground}
                  // Download pulls content down, an update pushes it up: the
                  // nudge travels the same way the icon reads.
                  distance={isUpdateMode ? -3 : 3}
                />
                <ThemedText type="smallBold" style={{ color: theme.primaryForeground }}>
                  {isUpdateMode
                    ? t("download.updateOfflineTour")
                    : t("download.downloadForOffline")}
                </ThemedText>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

type SelectionsGridProps = {
  audience: AudienceType;
  audienceLabel: (a: AudienceType) => string;
  onAudienceChange: (a: AudienceType) => void;
  contentLanguage: AppLanguage;
  languageLabel: (l: AppLanguage) => string;
  languages: AppLanguage[];
  onLanguageChange: (l: AppLanguage) => void;
  downloadMode: DownloadMode;
  downloadModeLabel: (m: DownloadMode) => string;
  downloadModeDescription: (m: DownloadMode) => string;
  onDownloadModeChange: (m: DownloadMode) => void;
  t: ReturnType<typeof useStrings>["t"];
};

function SelectionsGrid(props: SelectionsGridProps) {
  return (
    <View style={styles.selectionsGrid}>
      <SelectionSection title={props.t("prepare.audience")}>
        {AUDIENCE_TYPES.map((value) => (
          <PillOption
            key={value}
            label={props.audienceLabel(value)}
            selected={props.audience === value}
            onPress={() => props.onAudienceChange(value)}
          />
        ))}
      </SelectionSection>

      <SelectionSection title={props.t("prepare.tourLanguage")}>
        {props.languages.map((value) => (
          <PillOption
            key={value}
            label={props.languageLabel(value)}
            selected={props.contentLanguage === value}
            onPress={() => props.onLanguageChange(value)}
          />
        ))}
      </SelectionSection>

      <View style={styles.selectionsSubsection}>
        <ThemedText type="smallBold">{props.t("prepare.downloadMode")}</ThemedText>
        <View style={styles.pillRow}>
          {DOWNLOAD_MODES.map((value) => (
            <PillOption
              key={value}
              label={props.downloadModeLabel(value)}
              selected={props.downloadMode === value}
              onPress={() => props.onDownloadModeChange(value)}
            />
          ))}
        </View>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.downloadModeDesc}
        >
          {props.downloadModeDescription(props.downloadMode)}
        </ThemedText>
      </View>
    </View>
  );
}

function SelectionSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.selectionsSubsection}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <View style={styles.pillRow}>{children}</View>
    </View>
  );
}

/** One nudge, then a pause — a steady bounce reads as a loading spinner. */
const NUDGE_MS = 420;
const NUDGE_REST_MS = 1400;

/**
 * The CTA icon nudges in a slow loop so the eye lands on it after the pickers
 * above: pick your options, then press here. Deliberately small (a few pixels)
 * and paused between beats — the button is the last step of the flow, not an
 * alarm.
 *
 * Focus-gated with `cancelAnimation` on blur, following the same reasoning as
 * `floor-card.tsx`: an infinite loop left running through a screen transition
 * costs frames on Android for a nudge nobody is looking at.
 */
function NudgingCtaIcon({
  name,
  color,
  distance,
}: {
  name: ComponentProps<typeof Ionicons>["name"];
  color: string;
  distance: number;
}) {
  const isFocused = useIsFocused();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(offset);
      offset.value = withTiming(0, { duration: 160 });
      return;
    }

    offset.value = withRepeat(
      withSequence(
        withTiming(distance, {
          duration: NUDGE_MS,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0, {
          duration: NUDGE_MS,
          easing: Easing.in(Easing.quad),
        }),
        // Hold still before the next nudge.
        withDelay(NUDGE_REST_MS, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(offset);
  }, [distance, isFocused, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={name} size={18} color={color} />
    </Animated.View>
  );
}

function PillOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundSelected,
        },
      ]}
    >
      <ThemedText
        type="smallBold"
        style={{
          color: selected ? theme.primaryForeground : theme.text,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  selectionsCard: {
    gap: Spacing.four,
  },
  selectionsGrid: {
    gap: Spacing.four,
  },
  selectionsSubsection: {
    gap: Spacing.two,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  downloadModeDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  progressCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  progressLabel: {
    flex: 1,
  },
  percentText: {
    alignSelf: "center",
    fontSize: 18,
    lineHeight: 24,
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 2,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  errorText: {
    color: "#dc2626",
  },
});

export default TourPrepareScreen;

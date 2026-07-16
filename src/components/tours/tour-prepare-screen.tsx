import type { ReactNode } from "react";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
import { useEntitlementStatus } from "@/hooks/use-entitlement-status";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { getApiErrorMessage } from "@/lib/api-error";
import type { DownloadProgress } from "@/lib/bundle/download-progress";
import {
  formatDownloadPercent,
  getDownloadProgressLabel,
} from "@/lib/bundle/download-progress-label";
import { useLocaleStore, APP_LANGUAGES, type AppLanguage } from "@/store/locale-store";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import { useReleaseConfigStore } from "@/store/release-config-store";

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

  const [audience, setAudience] = useState<AudienceType>(DEFAULT_AUDIENCE);
  const [contentLanguage, setContentLanguage] = useState<AppLanguage>(uiLanguage);
  const [downloadMode, setDownloadMode] =
    useState<DownloadMode>(DEFAULT_DOWNLOAD_MODE);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(
    null,
  );

  useEffect(() => {
    if (!installed?.downloadPreferences) {
      return;
    }

    setAudience(installed.downloadPreferences.audience);
    setContentLanguage(installed.downloadPreferences.contentLanguage);
    setDownloadMode(installed.downloadPreferences.downloadMode);
  }, [installed]);

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
            title={
              isUpdateMode ? t("prepare.updateTitle") : t("prepare.title")
            }
            subtitle={
              isUpdateMode && installed
                ? t("prepare.updateSubtitle", {
                    version: installed.tourBundleVersion,
                  })
                : undefined
            }
          />

          {!isDownloading ? (
            <>
              <Section title={t("prepare.audience")}>
                {AUDIENCE_TYPES.map((value) => (
                  <OptionCard
                    key={value}
                    label={audienceLabel(value)}
                    selected={audience === value}
                    onPress={() => setAudience(value)}
                  />
                ))}
              </Section>

              <Section title={t("prepare.tourLanguage")}>
                {languages.map((value) => (
                  <OptionCard
                    key={value}
                    label={languageLabel(value)}
                    selected={contentLanguage === value}
                    onPress={() => setContentLanguage(value)}
                  />
                ))}
              </Section>

              <Section title={t("prepare.downloadMode")}>
                {DOWNLOAD_MODES.map((value) => (
                  <OptionCard
                    key={value}
                    label={downloadModeLabel(value)}
                    description={downloadModeDescription(value)}
                    selected={downloadMode === value}
                    onPress={() => setDownloadMode(value)}
                  />
                ))}
              </Section>
            </>
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
                <Ionicons
                  name={
                    isUpdateMode
                      ? "cloud-upload-outline"
                      : "cloud-download-outline"
                  }
                  size={18}
                  color={theme.primaryForeground}
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

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={styles.optionList}>{children}</View>
    </View>
  );
}

function OptionCard({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
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
        styles.optionCard,
        selected
          ? {
              borderColor: theme.primary,
              backgroundColor: theme.primary,
            }
          : {
              borderColor: "rgba(255, 255, 255, 0.22)",
              backgroundColor: "rgba(28, 25, 23, 0.55)",
            },
      ]}
    >
      <View style={styles.optionRow}>
        <View
          style={[
            styles.radioOuter,
            {
              borderColor: selected
                ? theme.primaryForeground
                : "rgba(255, 255, 255, 0.45)",
              backgroundColor: selected
                ? theme.primaryForeground
                : "transparent",
            },
          ]}
        >
          {selected ? (
            <Ionicons
              name="checkmark"
              size={12}
              color={theme.primary}
            />
          ) : null}
        </View>

        <View style={styles.optionCopy}>
          <ThemedText
            type="smallBold"
            style={{
              color: selected ? theme.primaryForeground : "#ffffff",
            }}
          >
            {label}
          </ThemedText>
          {description ? (
            <ThemedText
              type="small"
              style={{
                color: selected
                  ? "rgba(26, 18, 8, 0.72)"
                  : "rgba(255, 255, 255, 0.7)",
              }}
            >
              {description}
            </ThemedText>
          ) : null}
        </View>
      </View>
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
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  optionList: {
    gap: Spacing.two,
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  optionCopy: {
    flex: 1,
    gap: Spacing.half,
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

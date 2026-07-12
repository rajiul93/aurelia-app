import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { FaqAccordion } from "@/components/tours/faq-accordion";
import { PageBackground } from "@/components/page-background";
import { SpotAudioSection } from "@/components/tours/spot-audio-section";
import { SpotDetailHeader } from "@/components/tours/spot-detail-header";
import { SpotVisualMediaGallery } from "@/components/tours/spot-visual-media-gallery";
import { GoldGradientButton } from "@/components/ui/gold-gradient-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useAppContent } from "@/hooks/queries/use-app-content";
import { useInstalledTourView } from "@/hooks/use-installed-tour-view";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { resolveAppBackgroundUrl } from "@/lib/app-content/resolve-asset";
import { pickAudienceTranslation } from "@/lib/bundle/localize";
import { orderSpotsByRoute } from "@/lib/bundle/route-order";
import { useSpotBookmarksStore } from "@/store/spot-bookmarks-store";
import { useTourProgressStore } from "@/store/tour-progress-store";

export default function SpotDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useStrings();
  const { tourId, spotId } = useLocalSearchParams<{
    tourId: string;
    spotId: string;
  }>();
  const { data: contentResponse } = useAppContent();
  const backgroundUrl = resolveAppBackgroundUrl(contentResponse?.data.assets);
  const { data: content, isResolving, isError, preferences } =
    useInstalledTourView(tourId);
  const isComplete = useTourProgressStore((state) =>
    state.byTourId[tourId ?? ""]?.completedSpotIds.includes(spotId ?? ""),
  );
  const toggleComplete = useTourProgressStore((state) => state.toggleSpotComplete);
  const bookmarked = useSpotBookmarksStore((state) =>
    state.byTourId[tourId ?? ""]?.includes(spotId ?? ""),
  );
  const toggleBookmark = useSpotBookmarksStore((state) => state.toggleBookmark);

  if (isResolving) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (isError || !content || !tourId || !spotId) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="smallBold">{t("tour.notInstalled")}</ThemedText>
      </ThemedView>
    );
  }

  const spots = orderSpotsByRoute(content.tour.spots, content.route);
  const spotIndex = spots.findIndex((spot) => spot.id === spotId);
  const spot = spots[spotIndex];

  if (!spot) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="smallBold">{t("spot.notFound")}</ThemedText>
      </ThemedView>
    );
  }

  const translation = preferences
    ? pickAudienceTranslation(
        spot.translations.map((entry) => ({
          ...entry,
          audience: entry.audience ?? "ADULTS",
        })),
        preferences.contentLanguage,
        preferences.audience,
      )
    : null;
  const previousSpot = spotIndex > 0 ? spots[spotIndex - 1] : null;
  const nextSpot =
    spotIndex < spots.length - 1 ? spots[spotIndex + 1] : null;

  const faqItems = spot.faqs
    .map((faq) => {
      const faqTranslation = preferences
        ? pickAudienceTranslation(
            faq.translations.map((entry) => ({
              ...entry,
              audience: entry.audience ?? "ADULTS",
            })),
            preferences.contentLanguage,
            preferences.audience,
          )
        : null;

      if (!faqTranslation?.question) {
        return null;
      }

      return {
        id: faq.id,
        question: faqTranslation.question,
        answer: faqTranslation.answerText,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const transcript =
    translation?.descriptionText?.trim() ||
    translation?.shortDesc?.trim() ||
    "";

  return (
    <PageBackground uri={backgroundUrl} darkOverlay>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.screen}>
          <View style={styles.headerWrap}>
            <SpotDetailHeader
              stopLabel={t("spot.indexOfTotal", {
                current: spotIndex + 1,
                total: spots.length,
              })}
              bookmarked={bookmarked}
              onClose={() => router.push(`/tour/${tourId}`)}
              onToggleBookmark={() => void toggleBookmark(tourId, spotId)}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="subtitle" style={styles.heroTitle}>
              {translation?.title ?? t("tour.stopFallback")}
            </ThemedText>

            {translation?.shortDesc ? (
              <ThemedText type="small" style={styles.heroSubtitle}>
                {translation.shortDesc}
              </ThemedText>
            ) : null}

            <View style={styles.audioBlock}>
              <SpotAudioSection tourId={tourId} spot={spot} variant="immersive" />
            </View>

            {transcript ? (
              <View style={styles.transcriptSection}>
                <ThemedText type="smallBold" style={styles.transcriptLabel}>
                  {t("spot.transcript")}
                </ThemedText>
                <ThemedText type="small" style={styles.transcriptBody}>
                  {transcript}
                </ThemedText>
              </View>
            ) : null}

            <SpotVisualMediaGallery tourId={tourId} spot={spot} onDark />

            {faqItems.length > 0 ? (
              <FaqAccordion
                title={t("spot.faqs")}
                items={faqItems}
                onDark
              />
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                borderTopColor: "rgba(255,255,255,0.1)",
                paddingBottom: Math.max(insets.bottom, Spacing.three),
              },
            ]}
          >
            {previousSpot ? (
              <Pressable
                onPress={() =>
                  router.replace(`/tour/${tourId}/spot/${previousSpot.id}`)
                }
              >
                <ThemedText type="small" style={styles.footerLink}>
                  {t("spot.previous")}
                </ThemedText>
              </Pressable>
            ) : (
              <ThemedText type="small" style={styles.footerLinkDisabled}>
                {t("spot.previous")}
              </ThemedText>
            )}

            <Pressable
              onPress={() => void toggleComplete(tourId, spotId)}
              style={styles.completeButton}
            >
              <Ionicons
                name={isComplete ? "checkbox" : "square-outline"}
                size={20}
                color={theme.primary}
              />
              <ThemedText type="small" style={styles.completeLabel}>
                {t("spot.markComplete")}
              </ThemedText>
            </Pressable>

            {nextSpot ? (
              <GoldGradientButton
                label={t("spot.next")}
                showArrow
                onPress={() =>
                  router.replace(`/tour/${tourId}/spot/${nextSpot.id}`)
                }
              />
            ) : (
              <GoldGradientButton
                label={t("spot.done")}
                showArrow
                onPress={() => router.push(`/tour/${tourId}`)}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  headerWrap: {
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  heroTitle: {
    color: "#ffffff",
    marginTop: Spacing.two,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.6)",
  },
  audioBlock: {
    marginTop: Spacing.two,
  },
  transcriptSection: {
    gap: Spacing.two,
    alignSelf: "stretch",
  },
  transcriptLabel: {
    color: "#e1a566",
  },
  transcriptBody: {
    color: "rgba(255,255,255,0.75)",
    lineHeight: 22,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  footerLink: {
    color: "rgba(255,255,255,0.7)",
  },
  footerLinkDisabled: {
    color: "rgba(255,255,255,0.3)",
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    flexShrink: 1,
  },
  completeLabel: {
    color: "rgba(255,255,255,0.8)",
  },
});

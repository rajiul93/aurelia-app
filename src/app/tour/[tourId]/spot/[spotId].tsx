import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { FaqAccordion } from "@/components/tours/faq-accordion";
import { SpotAudioSection } from "@/components/tours/spot-audio-section";
import { SpotDetailHeader } from "@/components/tours/spot-detail-header";
import { SpotDetailSkeleton } from "@/components/tours/spot-detail-skeleton";
import { SpotVisualMediaGallery } from "@/components/tours/spot-visual-media-gallery";
import { GoldGradientButton } from "@/components/ui/gold-gradient-button";
import { GlassCard } from "@/components/ui/glass-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useInstalledTourView } from "@/hooks/use-installed-tour-view";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { pickAudienceTranslation } from "@/lib/bundle/localize";
import { orderSpotsAcrossFloors } from "@/lib/bundle/route-order";
import { resolveSpotFloorId } from "@/lib/bundle/floor-routing";
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
  const {
    data: content,
    isResolving,
    hasRawContent,
    tourId: resolvedTourId,
    preferences,
  } = useInstalledTourView(tourId);
  const isComplete = useTourProgressStore((state) =>
    state.byTourId[resolvedTourId ?? ""]?.completedSpotIds.includes(
      spotId ?? "",
    ),
  );
  const toggleComplete = useTourProgressStore(
    (state) => state.toggleSpotComplete,
  );
  const bookmarked = useSpotBookmarksStore((state) =>
    state.byTourId[resolvedTourId ?? ""]?.includes(spotId ?? ""),
  );
  const toggleBookmark = useSpotBookmarksStore((state) => state.toggleBookmark);

  if (isResolving) {
    return <SpotDetailSkeleton />;
  }

  if (!hasRawContent || !content || !resolvedTourId || !spotId) {
    return (
      <ThemedView transparent style={styles.centered}>
        <GlassCard style={styles.messageCard}>
          <Ionicons name="cloud-offline-outline" size={28} color={theme.primary} />
          <ThemedText type="smallBold" style={styles.messageTitle}>
            {t("tour.notInstalled")}
          </ThemedText>
        </GlassCard>
      </ThemedView>
    );
  }

  const spots = orderSpotsAcrossFloors(content);
  const spotIndex = spots.findIndex((spot) => spot.id === spotId);
  const spot = spots[spotIndex];

  if (!spot) {
    return (
      <ThemedView transparent style={styles.centered}>
        <GlassCard style={styles.messageCard}>
          <Ionicons name="alert-circle-outline" size={28} color={theme.primary} />
          <ThemedText type="smallBold" style={styles.messageTitle}>
            {t("spot.notFound")}
          </ThemedText>
        </GlassCard>
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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.headerWrap}>
          <SpotDetailHeader
            stopLabel={t("spot.indexOfTotal", {
              current: spotIndex + 1,
              total: spots.length,
            })}
            bookmarked={bookmarked}
            onClose={() =>
              router.canGoBack()
                ? router.back()
                : router.replace(`/tour/${resolvedTourId}`)
            }
            onToggleBookmark={() =>
              void toggleBookmark(resolvedTourId, spotId)
            }
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.stopBadge}>
              <Ionicons name="location" size={12} color={theme.primary} />
              <ThemedText type="smallBold" style={styles.stopBadgeText}>
                {t("spot.indexOfTotal", {
                  current: spotIndex + 1,
                  total: spots.length,
                })}
              </ThemedText>
            </View>

            <View style={styles.titleRow}>
              <ThemedText type="subtitle" style={styles.heroTitle}>
                {translation?.title ?? t("tour.stopFallback")}
              </ThemedText>

              <Pressable
                accessibilityLabel={t("spot.openFloorMap")}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  const floorId = resolveSpotFloorId(content, spot);
                  router.push(
                    floorId
                      ? `/tour/${resolvedTourId}/nav?floorId=${floorId}`
                      : `/tour/${resolvedTourId}/nav`,
                  );
                }}
                style={styles.mapButton}
              >
                <Ionicons name="map" size={18} color={theme.primary} />
              </Pressable>
            </View>
          </View>

          <SpotVisualMediaGallery
            tourId={resolvedTourId}
            spot={spot}
            onDark
          />

          <View style={styles.audioBlock}>
            <SpotAudioSection
              tourId={resolvedTourId}
              spot={spot}
              variant="immersive"
            />
          </View>

          {transcript ? (
            <GlassCard style={styles.transcriptCard}>
              <ThemedText type="smallBold" style={styles.transcriptLabel}>
                {t("spot.transcript")}
              </ThemedText>
              <ThemedText type="small" style={styles.transcriptBody}>
                {transcript}
              </ThemedText>
            </GlassCard>
          ) : null}

          {faqItems.length > 0 ? (
            <GlassCard style={styles.faqCard}>
              <FaqAccordion
                title={t("spot.faqs")}
                items={faqItems}
                onDark
              />
            </GlassCard>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
        >
          {previousSpot ? (
            <Pressable
              onPress={() =>
                router.replace(
                  `/tour/${resolvedTourId}/spot/${previousSpot.id}`,
                )
              }
              style={styles.footerNav}
            >
              <Ionicons name="chevron-back" size={16} color="#ffffff" />
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
            onPress={() => void toggleComplete(resolvedTourId, spotId)}
            style={[
              styles.completeButton,
              isComplete && styles.completeButtonActive,
            ]}
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
              icon="arrow-forward"
              onPress={() =>
                router.replace(
                  `/tour/${resolvedTourId}/spot/${nextSpot.id}`,
                )
              }
            />
          ) : (
            <GoldGradientButton
              label={t("spot.done")}
              icon="checkmark"
              onPress={() => router.push(`/tour/${resolvedTourId}`)}
            />
          )}
        </View>
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
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  messageCard: {
    alignItems: "center",
    gap: Spacing.three,
    minWidth: "70%",
  },
  messageTitle: {
    color: "#ffffff",
    textAlign: "center",
  },
  headerWrap: {
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  stopBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    backgroundColor: "rgba(28, 25, 23, 0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(225, 165, 102, 0.4)",
  },
  stopBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    lineHeight: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  heroTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 22,
    lineHeight: 28,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(28, 25, 23, 0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(225, 165, 102, 0.45)",
  },
  audioBlock: {
    marginTop: Spacing.one,
  },
  transcriptCard: {
    gap: Spacing.two,
  },
  transcriptLabel: {
    color: "#e1a566",
  },
  transcriptBody: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 22,
  },
  faqCard: {
    paddingVertical: Spacing.one,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    backgroundColor: "rgba(12, 10, 9, 0.72)",
  },
  footerLink: {
    color: "rgba(255,255,255,0.78)",
  },
  footerNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  footerLinkDisabled: {
    color: "rgba(255,255,255,0.28)",
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    flexShrink: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  completeButtonActive: {
    backgroundColor: "rgba(225, 165, 102, 0.16)",
  },
  completeLabel: {
    color: "rgba(255,255,255,0.85)",
  },
});

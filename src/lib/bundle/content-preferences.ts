import type { AudienceType } from "@/constants/audiences";
import { DEFAULT_AUDIENCE } from "@/constants/audiences";
import type { DownloadMode } from "@/constants/download-mode";
import type { AppLanguage } from "@/store/locale-store";
import type {
  BundleAiKnowledge,
  BundleContent,
  BundleSpot,
  BundleSpotFaq,
  BundleSpotMedia,
  SearchDocument,
} from "@/types/bundle-content";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

type WithLanguage = { language: AppLanguage };
type WithAudience = { audience: AudienceType };

export function pickAudienceTranslation<
  T extends WithLanguage & Partial<WithAudience>,
>(
  translations: T[],
  language: AppLanguage,
  audience: AudienceType = DEFAULT_AUDIENCE,
) {
  return (
    translations.find(
      (entry) => entry.language === language && entry.audience === audience,
    ) ??
    translations.find(
      (entry) => entry.language === language && entry.audience === DEFAULT_AUDIENCE,
    ) ??
    translations.find((entry) => entry.language === language) ??
    translations[0] ??
    null
  );
}

export function filterSpotMedia(
  medias: BundleSpotMedia[],
  preferences: TourDownloadPreferences,
) {
  return medias.filter((media) => {
    const mediaAudience = media.audience ?? "ADULTS";
    if (mediaAudience !== preferences.audience) {
      return false;
    }

    const mediaLanguage = media.language;
    if (!mediaLanguage || mediaLanguage !== preferences.contentLanguage) {
      return false;
    }

    if (preferences.downloadMode === "QUICK") {
      if (media.includedInQuickTour === false) {
        return false;
      }

      return media.type === "AUDIO";
    }

    return true;
  });
}

export function filterSpotsForPreferences(
  spots: BundleSpot[],
  preferences: TourDownloadPreferences,
) {
  return spots.filter((spot) => {
    if (
      preferences.downloadMode === "QUICK" &&
      spot.includedInQuickTour === false
    ) {
      return false;
    }

    return pickAudienceTranslation(
      spot.translations.map((translation) => ({
        ...translation,
        audience: translation.audience ?? "ADULTS",
      })),
      preferences.contentLanguage,
      preferences.audience,
    );
  });
}

export function filterFaqsForPreferences(
  faqs: BundleSpotFaq[],
  preferences: TourDownloadPreferences,
) {
  return faqs
    .map((faq) => ({
      ...faq,
      translations: faq.translations.filter(
        (translation) =>
          translation.language === preferences.contentLanguage &&
          translation.audience === preferences.audience,
      ),
    }))
    .filter((faq) => faq.translations.length > 0);
}

export function filterAiKnowledgeForPreferences(
  entries: BundleAiKnowledge[] | undefined,
  preferences: TourDownloadPreferences,
) {
  return (entries ?? [])
    .map((entry) => ({
      ...entry,
      translations: entry.translations.filter(
        (translation) =>
          translation.language === preferences.contentLanguage &&
          translation.audience === preferences.audience,
      ),
    }))
    .filter((entry) => entry.translations.length > 0);
}

export function filterSearchDocuments(
  documents: SearchDocument[],
  preferences: TourDownloadPreferences,
) {
  return documents.filter(
    (document) =>
      document.language === preferences.contentLanguage &&
      document.audience === preferences.audience,
  );
}

export function applyTourPreferences(
  content: BundleContent,
  preferences: TourDownloadPreferences,
): BundleContent {
  const spots = filterSpotsForPreferences(content.tour.spots, preferences).map(
    (spot) => ({
      ...spot,
      medias: filterSpotMedia(spot.medias, preferences),
      faqs: filterFaqsForPreferences(spot.faqs, preferences),
    }),
  );

  return {
    ...content,
    tour: {
      ...content.tour,
      spots,
    },
    aiKnowledge: filterAiKnowledgeForPreferences(
      content.aiKnowledge,
      preferences,
    ),
  };
}

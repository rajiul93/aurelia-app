import type { AudienceType } from "@/constants/audiences";
import type { AppLanguage } from "@/store/locale-store";

type Translated = {
  language: AppLanguage;
  audience?: AudienceType;
};

export function pickTranslation<T extends Translated>(
  translations: T[],
  language: AppLanguage,
  audience?: AudienceType,
) {
  if (audience) {
    const match = translations.find(
      (entry) => entry.language === language && entry.audience === audience,
    );
    if (match) {
      return match;
    }
  }

  return (
    translations.find((entry) => entry.language === language) ??
    translations[0] ??
    null
  );
}

export function pickAudienceTranslation<T extends Translated & { audience: AudienceType }>(
  translations: T[],
  language: AppLanguage,
  audience: AudienceType,
) {
  return (
    translations.find(
      (entry) => entry.language === language && entry.audience === audience,
    ) ??
    translations.find((entry) => entry.audience === audience) ??
    pickTranslation(translations, language) ??
    null
  );
}

export function localizeTourTitle(
  tour: {
    title?: string;
    translations: Array<{ language: AppLanguage; audience?: AudienceType; title: string }>;
  },
  language: AppLanguage,
  audience?: AudienceType,
) {
  if (tour.title) {
    return tour.title;
  }

  return pickTranslation(tour.translations, language, audience)?.title ?? "Tour";
}

export function localizeTourDescription(
  tour: {
    description?: string;
    translations: Array<{
      language: AppLanguage;
      audience?: AudienceType;
      description: string;
    }>;
  },
  language: AppLanguage,
  audience?: AudienceType,
) {
  if (tour.description) {
    return tour.description;
  }

  return pickTranslation(tour.translations, language, audience)?.description ?? "";
}

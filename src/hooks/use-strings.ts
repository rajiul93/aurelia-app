import { useMemo } from "react";

import type { AudienceType } from "@/constants/audiences";
import type { DownloadMode } from "@/constants/download-mode";
import { useAppContent } from "@/hooks/queries/use-app-content";
import {
  translateString,
  type StringKey,
} from "@/i18n/strings";
import { useLocaleStore, type AppLanguage } from "@/store/locale-store";

type TranslateParams = Record<string, string | number>;

const AUDIENCE_KEYS: Record<AudienceType, StringKey> = {
  CHILDREN: "audience.children",
  ADULTS: "audience.adults",
  STUDENTS: "audience.students",
  PROFESSORS: "audience.professors",
};

const DOWNLOAD_MODE_LABEL_KEYS: Record<DownloadMode, StringKey> = {
  FULL: "downloadMode.full.label",
  QUICK: "downloadMode.quick.label",
};

const DOWNLOAD_MODE_DESCRIPTION_KEYS: Record<DownloadMode, StringKey> = {
  FULL: "downloadMode.full.description",
  QUICK: "downloadMode.quick.description",
};

const LANGUAGE_KEYS: Record<AppLanguage, StringKey> = {
  en: "language.en",
  es: "language.es",
  fr: "language.fr",
};

export function useStrings() {
  const language = useLocaleStore((state) => state.language);
  const { data: contentResponse } = useAppContent();
  const remoteStrings = contentResponse?.data.strings;

  return useMemo(() => {
    function t(key: StringKey, params?: TranslateParams) {
      return translateString(language, key, remoteStrings, params);
    }

    function getTimeGreeting() {
      const hour = new Date().getHours();

      if (hour < 12) {
        return t("greeting.morning");
      }

      if (hour < 17) {
        return t("greeting.afternoon");
      }

      return t("greeting.evening");
    }

    return {
      t,
      language,
      languageLabel: (code: AppLanguage) => t(LANGUAGE_KEYS[code]),
      audienceLabel: (audience: AudienceType) => t(AUDIENCE_KEYS[audience]),
      downloadModeLabel: (mode: DownloadMode) => t(DOWNLOAD_MODE_LABEL_KEYS[mode]),
      downloadModeDescription: (mode: DownloadMode) =>
        t(DOWNLOAD_MODE_DESCRIPTION_KEYS[mode]),
      getTimeGreeting,
    };
  }, [language, remoteStrings]);
}

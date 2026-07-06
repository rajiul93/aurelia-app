import { getSecureItem, setSecureItem } from "@/lib/secure-storage";
import type { AppLanguage } from "@/store/locale-store";

const LOCALE_KEY = "aurelia.locale";

export async function readPersistedLocale() {
  const value = await getSecureItem(LOCALE_KEY);
  if (value === "en" || value === "es" || value === "fr") {
    return value as AppLanguage;
  }

  return null;
}

export async function writePersistedLocale(language: AppLanguage) {
  await setSecureItem(LOCALE_KEY, language);
}

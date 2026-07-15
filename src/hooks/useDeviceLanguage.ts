import { useLocaleStore } from "@/store/locale-store";

export function useDeviceLanguage(): "en" | "es" | "fr" {
  const language = useLocaleStore((state) => state.language);

  // Ensure it's one of the supported languages
  if (language === "es" || language === "fr") {
    return language;
  }

  return "en";
}

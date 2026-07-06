import { create } from "zustand";

import {
    readPersistedLocale,
    writePersistedLocale,
} from "@/lib/locale-storage";

export type AppLanguage = "en" | "es" | "fr";

type LocaleState = {
  language: AppLanguage;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

export const useLocaleStore = create<LocaleState>((set) => ({
  language: "en",
  hydrated: false,
  hydrate: async () => {
    const persisted = await readPersistedLocale();
    set({
      language: persisted ?? "en",
      hydrated: true,
    });
  },
  setLanguage: async (language) => {
    await writePersistedLocale(language);
    set({ language });
  },
}));

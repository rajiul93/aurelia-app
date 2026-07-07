import { create } from "zustand";

import { readPersistedTheme, writePersistedTheme } from "@/lib/theme-storage";

export type ThemeMode = "system" | "light" | "dark";

type ThemeState = {
  mode: ThemeMode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "system",
  hydrated: false,

  async hydrate() {
    const persisted = await readPersistedTheme();
    set({ mode: persisted ?? "system", hydrated: true });
  },

  async setMode(mode) {
    await writePersistedTheme(mode);
    set({ mode });
  },
}));

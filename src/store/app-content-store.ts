import { create } from "zustand";

import {
  loadCachedAppContent,
  saveCachedAppContent,
} from "@/lib/app-content/storage";
import type { AppContentBundle } from "@/types/app-content";

type AppContentState = {
  content: AppContentBundle | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setContent: (content: AppContentBundle) => Promise<void>;
};

/**
 * The disk-backed app-content snapshot. Unlike release-config there is no
 * sensible built-in default — the app ships compiled-in UI strings as the real
 * fallback (see i18n/strings.ts), and assets simply have no local stand-in — so
 * `content` stays null until a disk read or a fetch fills it.
 */
export const useAppContentStore = create<AppContentState>((set) => ({
  content: null,
  hydrated: false,

  async hydrate() {
    const cached = await loadCachedAppContent();

    set({ content: cached, hydrated: true });
  },

  // Disk first, then memory: a write that fails must not leave the store
  // claiming something the next cold start won't find.
  async setContent(content) {
    await saveCachedAppContent(content);
    set({ content });
  },
}));

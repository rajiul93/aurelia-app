import { create } from "zustand";

import { knowledgeService } from "@/services/knowledge.service";
import {
  loadEncryptedPack,
  saveEncryptedPack,
} from "@/lib/knowledge/knowledge-storage";
import type { KnowledgePack } from "@/types/knowledge";

type SyncStatus = "idle" | "loading" | "ready" | "error";

type KnowledgeState = {
  pack: KnowledgePack | null;
  status: SyncStatus;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  sync: () => Promise<void>;
};

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  pack: null,
  status: "idle",
  hydrated: false,

  async hydrate() {
    const stored = await loadEncryptedPack();
    set({
      pack: stored,
      hydrated: true,
      status: stored ? "ready" : "idle",
    });
  },

  async sync() {
    const current = get().pack;
    set({ status: "loading" });

    try {
      const response = await knowledgeService.getPack();
      const next = response.data;

      if (!current || current.version !== next.version) {
        await saveEncryptedPack(next);
        set({ pack: next, status: "ready" });
      } else {
        set({ status: "ready" });
      }
    } catch {
      // Offline or server error: keep whatever we already have cached.
      set({ status: current ? "ready" : "error" });
    }
  },
}));

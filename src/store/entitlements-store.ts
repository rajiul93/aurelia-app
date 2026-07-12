import { create } from "zustand";

import {
  clearEntitlementsSnapshot,
  loadEntitlementsSnapshot,
  saveEntitlementsSnapshot,
} from "@/lib/entitlements/storage";
import type { Entitlements, EntitlementsSnapshot } from "@/types/auth";

type EntitlementsState = {
  snapshot: EntitlementsSnapshot | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setEntitlements: (entitlements: Entitlements) => Promise<void>;
  clear: () => Promise<void>;
};

/**
 * Holds the on-disk entitlements snapshot. Access decisions read from here, not
 * from a live query, so a downloaded tour opens with zero network calls until its
 * access window expires.
 */
export const useEntitlementsStore = create<EntitlementsState>((set) => ({
  snapshot: null,
  hydrated: false,

  async hydrate() {
    const snapshot = await loadEntitlementsSnapshot();

    set({ snapshot, hydrated: true });
  },

  async setEntitlements(entitlements) {
    const snapshot: EntitlementsSnapshot = {
      entitlements,
      fetchedAt: new Date().toISOString(),
    };

    await saveEntitlementsSnapshot(snapshot);
    set({ snapshot });
  },

  async clear() {
    await clearEntitlementsSnapshot();
    set({ snapshot: null });
  },
}));

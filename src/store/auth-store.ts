import { create } from "zustand";

import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from "@/lib/secure-storage";

const SESSION_TOKEN_KEY = "aurelia.sessionToken";
/**
 * Still "sessionEmail" on disk: the key names an existing SecureStore entry, and
 * renaming it would strand the identity of everyone who already unlocked. What it
 * holds is now the phone number.
 */
const SESSION_IDENTITY_KEY = "aurelia.sessionEmail";

type AuthState = {
  sessionToken: string | null;
  /** The phone number the tour was unlocked with — shown back to the buyer. */
  phone: string | null;
  accessEndedReason: "session_expired" | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (sessionToken: string, phone: string) => Promise<void>;
  clearSession: (reason?: "session_expired") => Promise<void>;
  clearAccessEndedReason: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  sessionToken: null,
  phone: null,
  accessEndedReason: null,
  hydrated: false,

  async hydrate() {
    const [sessionToken, phone] = await Promise.all([
      getSecureItem(SESSION_TOKEN_KEY),
      getSecureItem(SESSION_IDENTITY_KEY),
    ]);

    set({
      sessionToken,
      phone,
      hydrated: true,
    });
  },

  async setSession(sessionToken, phone) {
    await Promise.all([
      setSecureItem(SESSION_TOKEN_KEY, sessionToken),
      setSecureItem(SESSION_IDENTITY_KEY, phone),
    ]);
    set({
      sessionToken,
      phone,
      accessEndedReason: null,
    });
  },

  async clearSession(reason) {
    await Promise.all([
      deleteSecureItem(SESSION_TOKEN_KEY),
      deleteSecureItem(SESSION_IDENTITY_KEY),
    ]);
    set({
      sessionToken: null,
      phone: null,
      accessEndedReason: reason ?? null,
    });
  },

  clearAccessEndedReason() {
    set({ accessEndedReason: null });
  },
}));

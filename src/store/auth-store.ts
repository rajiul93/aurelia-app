import { create } from "zustand";

import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from "@/lib/secure-storage";

const SESSION_TOKEN_KEY = "aurelia.sessionToken";
const SESSION_EMAIL_KEY = "aurelia.sessionEmail";

type AuthState = {
  sessionToken: string | null;
  email: string | null;
  accessEndedReason: "session_expired" | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (sessionToken: string, email: string) => Promise<void>;
  clearSession: (reason?: "session_expired") => Promise<void>;
  clearAccessEndedReason: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  sessionToken: null,
  email: null,
  accessEndedReason: null,
  hydrated: false,

  async hydrate() {
    const [sessionToken, email] = await Promise.all([
      getSecureItem(SESSION_TOKEN_KEY),
      getSecureItem(SESSION_EMAIL_KEY),
    ]);

    set({
      sessionToken,
      email,
      hydrated: true,
    });
  },

  async setSession(sessionToken, email) {
    await Promise.all([
      setSecureItem(SESSION_TOKEN_KEY, sessionToken),
      setSecureItem(SESSION_EMAIL_KEY, email),
    ]);
    set({
      sessionToken,
      email,
      accessEndedReason: null,
    });
  },

  async clearSession(reason) {
    await Promise.all([
      deleteSecureItem(SESSION_TOKEN_KEY),
      deleteSecureItem(SESSION_EMAIL_KEY),
    ]);
    set({
      sessionToken: null,
      email: null,
      accessEndedReason: reason ?? null,
    });
  },

  clearAccessEndedReason() {
    set({ accessEndedReason: null });
  },
}));

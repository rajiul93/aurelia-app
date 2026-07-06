import { create } from "zustand";

import {
  clearOnboardingComplete,
  readOnboardingComplete,
  writeOnboardingComplete,
} from "@/lib/onboarding-storage";

type OnboardingState = {
  complete: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  markComplete: () => Promise<void>;
  reset: () => Promise<void>;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  complete: false,
  hydrated: false,
  hydrate: async () => {
    const complete = await readOnboardingComplete();
    set({ complete, hydrated: true });
  },
  markComplete: async () => {
    await writeOnboardingComplete();
    set({ complete: true });
  },
  reset: async () => {
    set({ complete: false });
    await clearOnboardingComplete();
  },
}));

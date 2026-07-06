import { deleteSecureItem, getSecureItem, setSecureItem } from "@/lib/secure-storage";

const ONBOARDING_KEY = "aurelia.onboardingComplete";

export async function readOnboardingComplete() {
  const value = await getSecureItem(ONBOARDING_KEY);
  return value === "true";
}

export async function writeOnboardingComplete() {
  await setSecureItem(ONBOARDING_KEY, "true");
}

export async function clearOnboardingComplete() {
  try {
    await deleteSecureItem(ONBOARDING_KEY);
  } catch {
    // Key may already be missing after manual storage clears.
  }
}

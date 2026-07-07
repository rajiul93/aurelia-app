import { getSecureItem, setSecureItem } from "@/lib/secure-storage";
import type { ThemeMode } from "@/store/theme-store";

const THEME_KEY = "aurelia.theme";

export async function readPersistedTheme(): Promise<ThemeMode | null> {
  const value = await getSecureItem(THEME_KEY);
  if (value === "system" || value === "light" || value === "dark") {
    return value;
  }

  return null;
}

export async function writePersistedTheme(mode: ThemeMode) {
  await setSecureItem(THEME_KEY, mode);
}

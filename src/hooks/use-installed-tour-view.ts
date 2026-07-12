import { useMemo } from "react";

import {
  applyTourPreferences,
  fallbackTourPreferences,
  resolveTourPreferences,
} from "@/lib/bundle/content-preferences";
import { useInstalledTourContent } from "@/hooks/queries/use-installed-tour-content";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import { useLocaleStore } from "@/store/locale-store";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

export function useInstalledTourView(tourId: string | undefined) {
  const query = useInstalledTourContent(tourId);
  const installed = useInstalledToursStore(
    (state) => (tourId ? state.installedByTourId[tourId] : null) ?? null,
  );
  const language = useLocaleStore((state) => state.language);

  // Preferences come from the on-disk install record first (source of truth,
  // available offline even before the store hydrates), falling back to the
  // in-memory store meta. If neither knows the tour but its content IS on disk,
  // fall back to defaults rather than claiming the tour isn't installed —
  // missing preferences must never hide a bundle the user already downloaded.
  const preferences: TourDownloadPreferences | null =
    resolveTourPreferences(
      query.data?.preferences,
      installed?.downloadPreferences,
    ) ?? (query.data?.content ? fallbackTourPreferences(language) : null);

  const viewContent = useMemo(() => {
    if (!query.data?.content || !preferences) {
      return null;
    }

    return applyTourPreferences(query.data.content, preferences);
  }, [query.data, preferences]);

  return {
    ...query,
    data: viewContent,
    preferences,
    installed,
  };
}

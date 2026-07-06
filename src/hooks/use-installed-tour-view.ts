import { useMemo } from "react";

import { applyTourPreferences } from "@/lib/bundle/content-preferences";
import { useInstalledTourContent } from "@/hooks/queries/use-installed-tour-content";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

export function useInstalledTourView(tourId: string | undefined) {
  const query = useInstalledTourContent(tourId);
  const installed = useInstalledToursStore(
    (state) => (tourId ? state.installedByTourId[tourId] : null) ?? null,
  );

  const preferences: TourDownloadPreferences | null =
    installed?.downloadPreferences ?? null;

  const viewContent = useMemo(() => {
    if (!query.data || !preferences) {
      return null;
    }

    return applyTourPreferences(query.data, preferences);
  }, [query.data, preferences]);

  return {
    ...query,
    data: viewContent,
    preferences,
    installed,
  };
}

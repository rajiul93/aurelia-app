import { useMemo } from "react";

import {
  applyTourPreferences,
  fallbackTourPreferences,
  resolveTourPreferences,
} from "@/lib/bundle/content-preferences";
import { useInstalledTourContent } from "@/hooks/queries/use-installed-tour-content";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import { useLocaleStore } from "@/store/locale-store";
import { normalizeRouteParam } from "@/lib/router/normalize-route-param";
import type { TourDownloadPreferences } from "@/types/tour-preferences";

export function useInstalledTourView(tourIdParam: string | string[] | undefined) {
  const tourId = normalizeRouteParam(tourIdParam);
  const query = useInstalledTourContent(tourIdParam);
  const installed = useInstalledToursStore(
    (state) => (tourId ? state.installedByTourId[tourId] : null) ?? null,
  );
  const language = useLocaleStore((state) => state.language);

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

  const hasRawContent = Boolean(query.data?.content);

  return {
    ...query,
    tourId,
    data: viewContent,
    preferences,
    installed,
    hasRawContent,
    rawContent: query.data?.content ?? null,
    isResolving:
      Boolean(tourId) &&
      !hasRawContent &&
      (query.isPending || query.isFetching),
  };
}

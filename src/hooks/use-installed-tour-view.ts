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

  // Memoized because `fallbackTourPreferences` returns a fresh object literal
  // every call. Unmemoized, `preferences` changed identity on every render, so
  // the `viewContent` memo below never hit and the whole content graph was
  // re-filtered and re-spread each time — and every consumer saw a new `content`.
  const storedPreferences = query.data?.preferences;
  const installedPreferences = installed?.downloadPreferences;
  const hasContent = Boolean(query.data?.content);

  const preferences: TourDownloadPreferences | null = useMemo(
    () =>
      resolveTourPreferences(storedPreferences, installedPreferences) ??
      (hasContent ? fallbackTourPreferences(language) : null),
    [storedPreferences, installedPreferences, hasContent, language],
  );

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

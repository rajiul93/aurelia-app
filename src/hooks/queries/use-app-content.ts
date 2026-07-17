import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { appContentService } from "@/services/app-content.service";
import { useAppContentStore } from "@/store/app-content-store";
import { useLocaleStore } from "@/store/locale-store";
import type { ApiSuccess } from "@/types/api";
import type { AppContentBundle } from "@/types/app-content";

/**
 * App content (remote UI strings + assets), disk-first.
 *
 * react-query's cache here is memory-only, so before this was disk-backed a
 * cold start with no network had no `assets` at all — and since the asset URLs
 * live *in* this payload, the app didn't know which background to ask for and
 * rendered none. (expo-image had the bytes cached all along; the URL was the
 * missing piece.) Now the hydrated on-disk snapshot seeds the query and every
 * successful fetch writes back.
 *
 * `useCachedAppContent` used to exist for the offline case with `enabled: false`.
 * It had no callers and is redundant now the snapshot covers cold starts.
 */
export function useAppContent() {
  const language = useLocaleStore((state) => state.language);
  const snapshot = useAppContentStore((state) => state.content);
  const setContent = useAppContentStore((state) => state.setContent);

  // Seed only when the snapshot matches the language being asked for —
  // otherwise the wrong copy would show until the fetch lands.
  const seed =
    snapshot && snapshot.language === language
      ? ({ success: true, data: snapshot } satisfies ApiSuccess<AppContentBundle>)
      : undefined;

  return useQuery({
    queryKey: queryKeys.appContent.detail(language),
    queryFn: async () => {
      const response = await appContentService.get(language);

      // Persist on the way through rather than from an effect on `data`, which
      // would also fire for cache reads and rewrite disk with what it just read.
      // Never fatal: a failed write costs the offline snapshot, not the screen.
      await setContent(response.data).catch(() => undefined);

      return response;
    },
    initialData: seed,
    // Disk first, then network. Without this the snapshot would count as fresh
    // under the global 60s staleTime and suppress the background refresh, so a
    // launch would show yesterday's copy and not go looking for today's.
    initialDataUpdatedAt: 0,
  });
}

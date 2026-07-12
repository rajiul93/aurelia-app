import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { appContentService } from "@/services/app-content.service";
import { useLocaleStore } from "@/store/locale-store";

export function useAppContent() {
  const language = useLocaleStore((state) => state.language);

  return useQuery({
    queryKey: queryKeys.appContent.detail(language),
    queryFn: () => appContentService.get(language),
  });
}

/**
 * Cache-only read: serves app content when a browsing screen has already fetched
 * it, and never issues a request. The downloaded-tour screens use this — opening
 * an installed tour must not hit the network, and app content only decorates them.
 */
export function useCachedAppContent() {
  const language = useLocaleStore((state) => state.language);

  return useQuery({
    queryKey: queryKeys.appContent.detail(language),
    queryFn: () => appContentService.get(language),
    enabled: false,
  });
}

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { catalogService } from "@/services/catalog.service";
import { useLocaleStore } from "@/store/locale-store";

export function useCatalogTours() {
  const language = useLocaleStore((state) => state.language);

  return useQuery({
    queryKey: queryKeys.catalog.tours(language),
    queryFn: () => catalogService.listTours(language),
  });
}

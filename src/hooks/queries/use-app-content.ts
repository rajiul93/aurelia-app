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

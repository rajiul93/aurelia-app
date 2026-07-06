import { useQuery } from "@tanstack/react-query";

import { resolveInstalledMediaUri } from "@/lib/bundle/media-cache";
import { useInstalledMediaMap } from "@/hooks/queries/use-installed-media-map";

export function useInstalledMediaUri(
  tourId: string | undefined,
  remoteUrl: string | undefined | null,
) {
  const { data: map } = useInstalledMediaMap(tourId);

  return useQuery({
    queryKey: ["installed-media-uri", tourId ?? "", remoteUrl ?? "", map?.cachedAt ?? ""],
    queryFn: () => resolveInstalledMediaUri(tourId!, remoteUrl, map),
    enabled: Boolean(tourId && remoteUrl),
    staleTime: Infinity,
  });
}

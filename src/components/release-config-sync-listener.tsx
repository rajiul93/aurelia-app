import { useBackgroundPrefetch } from "@/hooks/use-background-prefetch";
import { useReleaseConfigSync } from "@/hooks/use-release-config-sync";

/**
 * Owns the foreground version/config sync. This used to also mount
 * useVersionSync, which watched the same /versions query and fired the same
 * appContentVersion invalidation — a second AppState listener and a second
 * refetch to reach the same conclusion. useReleaseConfigSync does all of it.
 */
export function ReleaseConfigSyncListener() {
  useReleaseConfigSync();
  useBackgroundPrefetch();
  return null;
}

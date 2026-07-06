import { useReleaseConfigSync } from "@/hooks/use-release-config-sync";
import { useVersionSync } from "@/hooks/use-version-sync";

export function ReleaseConfigSyncListener() {
  useVersionSync();
  useReleaseConfigSync();
  return null;
}

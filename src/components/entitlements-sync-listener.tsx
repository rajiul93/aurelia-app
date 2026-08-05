import { useEntitlementsSync } from "@/hooks/use-entitlements-sync";

export function EntitlementsSyncListener() {
  useEntitlementsSync();
  return null;
}

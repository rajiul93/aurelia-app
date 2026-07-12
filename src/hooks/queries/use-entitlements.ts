import { useQuery } from "@tanstack/react-query";

import { isSnapshotUsable } from "@/lib/entitlements/access";
import { fetchAndPersistEntitlements } from "@/lib/entitlements/refresh";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/store/auth-store";
import { useEntitlementsStore } from "@/store/entitlements-store";
import type { ApiSuccess } from "@/types/api";
import type { Entitlements } from "@/types/auth";

/**
 * Entitlements are snapshot-first: the persisted copy seeds the query and the
 * network call only runs when there is no snapshot or its access window has
 * expired. A signed-in user with a valid snapshot therefore makes **no** API call
 * on launch, on foreground, or when opening a downloaded tour.
 *
 * Forced refreshes (sign-in, purchase, explicit user refresh) go through
 * `refreshEntitlements()` — a disabled query is never refetched by invalidation.
 */
export function useEntitlements() {
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const snapshot = useEntitlementsStore((state) => state.snapshot);
  const hydrated = useEntitlementsStore((state) => state.hydrated);

  const initialData: ApiSuccess<Entitlements> | undefined = snapshot
    ? { success: true, data: snapshot.entitlements }
    : undefined;

  return useQuery({
    queryKey: queryKeys.entitlements.me,
    queryFn: fetchAndPersistEntitlements,
    enabled: Boolean(sessionToken) && hydrated && !isSnapshotUsable(snapshot),
    initialData,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}

import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { authService } from "@/services/auth.service";
import { useEntitlementsStore } from "@/store/entitlements-store";

/** Fetches entitlements and persists them as the snapshot the app reads offline. */
export async function fetchAndPersistEntitlements() {
  const response = await authService.getEntitlements();
  await useEntitlementsStore.getState().setEntitlements(response.data);
  return response;
}

/**
 * Forces a network refresh of entitlements. Call this only where a round-trip is
 * warranted — sign-in, purchase, or an explicit user refresh; everything else must
 * read the snapshot.
 *
 * `invalidateQueries` cannot do this job: the entitlements query stays disabled
 * while a valid snapshot exists, and disabled queries are never refetched. Going
 * through `fetchQuery` (rather than calling the service directly) keeps the query
 * cache and its observers' loading state in sync.
 */
export async function refreshEntitlements(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    queryKey: queryKeys.entitlements.me,
    queryFn: fetchAndPersistEntitlements,
    staleTime: 0,
  });
}

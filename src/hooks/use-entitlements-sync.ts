import { useEffect } from "react";
import { AppState } from "react-native";

import { fetchAndPersistEntitlements } from "@/lib/entitlements/refresh";
import { useAuthStore } from "@/store/auth-store";
import { useEntitlementsStore } from "@/store/entitlements-store";

/**
 * How long a persisted snapshot may go unrefreshed before the app quietly checks
 * for a newer one. Entitlements are snapshot-first by design (see
 * `use-entitlements.ts`), and that is right for the *access window* — but the
 * snapshot also carries the **tour list**, which changes on the server without
 * the snapshot expiring: a newly published tour, or a grant widened by an admin.
 * With `staleTime: Infinity`, `enabled: !isSnapshotUsable(...)` and every
 * refetch-on-* disabled, a signed-in device would otherwise never fetch again
 * until its access expired — so a tour published today stayed locked for weeks.
 */
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;

function isStale(fetchedAt: string | undefined, now: number) {
  if (!fetchedAt) {
    return true;
  }

  const fetched = new Date(fetchedAt).getTime();

  // An unparseable timestamp means we cannot tell how old this is; refresh
  // rather than trust it forever.
  return Number.isNaN(fetched) || now - fetched >= REFRESH_AFTER_MS;
}

/**
 * Refreshes the entitlements snapshot in the background at cold start and on each
 * foreground, but only when it is older than `REFRESH_AFTER_MS` — so the offline
 * guarantee holds (nothing here blocks a render or a tour opening) while a device
 * still picks up newly unlocked tours on its own, within hours rather than never.
 *
 * Best-effort throughout: a failure (offline in the venue, transient 5xx) leaves
 * the existing snapshot in place, exactly as before. Not routed through
 * `refreshEntitlements(queryClient)` — that one is for user-visible refreshes that
 * should drive a spinner; this must stay invisible.
 */
export function useEntitlementsSync() {
  useEffect(() => {
    function refreshIfStale() {
      const { sessionToken } = useAuthStore.getState();
      const { snapshot, hydrated } = useEntitlementsStore.getState();

      // No session means nothing to refresh; not yet hydrated means the snapshot
      // on disk hasn't loaded, and firing now would misread it as missing.
      if (!sessionToken || !hydrated) {
        return;
      }

      if (!isStale(snapshot?.fetchedAt, Date.now())) {
        return;
      }

      void fetchAndPersistEntitlements().catch(() => undefined);
    }

    refreshIfStale();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshIfStale();
      }
    });

    return () => subscription.remove();
  }, []);
}

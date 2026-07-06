import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";

import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/store/auth-store";

export function EntitlementsRefreshListener() {
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.entitlements.all,
        });
      }
    });

    return () => subscription.remove();
  }, [queryClient, sessionToken]);

  return null;
}

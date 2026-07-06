import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";

export function useEntitlements() {
  const sessionToken = useAuthStore((state) => state.sessionToken);

  return useQuery({
    queryKey: queryKeys.entitlements.me,
    queryFn: () => authService.getEntitlements(),
    enabled: Boolean(sessionToken),
  });
}

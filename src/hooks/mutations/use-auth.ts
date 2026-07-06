import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { queryKeys } from "@/lib/query/keys";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";

export function useRequestOtp() {
  return useMutation({
    mutationFn: (email: string) => authService.requestOtp(email),
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authService.verifyOtp(email, code),
    onSuccess: async (response) => {
      await setSession(response.data.sessionToken, response.data.email);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.entitlements.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.versions.all,
      });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);
  const resetOnboarding = useOnboardingStore((state) => state.reset);

  return useMutation({
    mutationFn: async () => {
      useOnboardingStore.setState({ complete: false });

      try {
        await authService.revokeDevice();
      } catch {
        // Local sign-out should still succeed if the network call fails.
      }

      await clearSession();
      await resetOnboarding();
    },
    onSettled: () => {
      void queryClient.removeQueries({ queryKey: queryKeys.entitlements.all });
      router.dismissTo("/welcome");
    },
  });
}

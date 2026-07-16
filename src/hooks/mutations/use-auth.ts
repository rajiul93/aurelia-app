import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { refreshEntitlements } from "@/lib/entitlements/refresh";
import { queryKeys } from "@/lib/query/keys";
import { cancelAllReminders } from "@/lib/tour-reminder/scheduler";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { useEntitlementsStore } from "@/store/entitlements-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useTourReminderStore } from "@/store/tour-reminder-store";

export function useUnlockTour() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: ({ phone, pin }: { phone: string; pin: string }) =>
      authService.unlock(phone, pin),
    onSuccess: async (response) => {
      await setSession(response.data.sessionToken, response.data.phone);
      // Unlocking is one of the few moments a network round-trip is warranted:
      // it creates the snapshot every later access decision reads offline.
      await refreshEntitlements(queryClient).catch(() => undefined);
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

      // Local only: the device keeps its slot on the seller's side. Freeing a
      // slot is the seller's call, so signing out here must not do it silently —
      // otherwise a buyer could hand the tour around by signing out each time.
      await clearSession();
      await useEntitlementsStore.getState().clear();
      // Reminders are per-buyer; wipe local state and any scheduled OS notifications.
      await useTourReminderStore.getState().clear();
      await cancelAllReminders();
      await resetOnboarding();
    },
    onSettled: () => {
      void queryClient.removeQueries({ queryKey: queryKeys.entitlements.all });
      router.dismissTo("/welcome");
    },
  });
}

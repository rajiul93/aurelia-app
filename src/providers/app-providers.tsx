import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { AccessEndedListener } from "@/components/access-ended-listener";
import { EntitlementsRefreshListener } from "@/components/entitlements-refresh-listener";
import { MaintenanceGate } from "@/components/maintenance-gate";
import { OnboardingGate } from "@/components/onboarding-gate";
import { ReleaseConfigSyncListener } from "@/components/release-config-sync-listener";
import { setupAxiosInterceptors } from "@/lib/axios/interceptors";
import { queryClient } from "@/lib/query/client";
import { useAuthStore } from "@/store/auth-store";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import { useLocaleStore } from "@/store/locale-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useReleaseConfigStore } from "@/store/release-config-store";
import { useSpotBookmarksStore } from "@/store/spot-bookmarks-store";
import { useTourProgressStore } from "@/store/tour-progress-store";

setupAxiosInterceptors();

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateInstalledTours = useInstalledToursStore((state) => state.hydrate);
  const hydrateTourProgress = useTourProgressStore((state) => state.hydrate);
  const hydrateSpotBookmarks = useSpotBookmarksStore((state) => state.hydrate);
  const hydrateReleaseConfig = useReleaseConfigStore((state) => state.hydrate);
  const hydrateLocale = useLocaleStore((state) => state.hydrate);
  const hydrateOnboarding = useOnboardingStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateAuth();
    void hydrateInstalledTours();
    void hydrateTourProgress();
    void hydrateSpotBookmarks();
    void hydrateReleaseConfig();
    void hydrateLocale();
    void hydrateOnboarding();
  }, [
    hydrateAuth,
    hydrateInstalledTours,
    hydrateTourProgress,
    hydrateSpotBookmarks,
    hydrateReleaseConfig,
    hydrateLocale,
    hydrateOnboarding,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <ReleaseConfigSyncListener />
      <AccessEndedListener />
      <EntitlementsRefreshListener />
      <MaintenanceGate>
        <OnboardingGate>{children}</OnboardingGate>
      </MaintenanceGate>
    </QueryClientProvider>
  );
}

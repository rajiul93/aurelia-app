import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { AccessEndedListener } from "@/components/access-ended-listener";
import { EntitlementsRefreshListener } from "@/components/entitlements-refresh-listener";
import { InstalledToursRehydrateListener } from "@/components/installed-tours-rehydrate-listener";
import { KnowledgeGate } from "@/components/knowledge-gate";
import { KnowledgeSyncListener } from "@/components/knowledge-sync-listener";
import { MaintenanceGate } from "@/components/maintenance-gate";
import { OnboardingGate } from "@/components/onboarding-gate";
import { ReleaseConfigSyncListener } from "@/components/release-config-sync-listener";
import { setupAxiosInterceptors } from "@/lib/axios/interceptors";
import { env } from "@/lib/env";
import { queryClient } from "@/lib/query/client";

setupAxiosInterceptors();

type AppProvidersProps = {
  children: ReactNode;
};

// Store hydration is owned by useAppBootstrap (which gates the splash screen),
// so by the time AppProviders mounts every persisted store is already hydrated.
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider publishableKey={env.stripePublishableKey}>
        <ReleaseConfigSyncListener />
        <KnowledgeSyncListener />
        <InstalledToursRehydrateListener />
        <AccessEndedListener />
        <EntitlementsRefreshListener />
        <MaintenanceGate>
          <OnboardingGate>
            <KnowledgeGate>{children}</KnowledgeGate>
          </OnboardingGate>
        </MaintenanceGate>
      </StripeProvider>
    </QueryClientProvider>
  );
}

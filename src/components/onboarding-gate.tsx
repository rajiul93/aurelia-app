import { usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { useLocaleStore } from "@/store/locale-store";
import { useOnboardingStore } from "@/store/onboarding-store";

type OnboardingGateProps = {
  children: ReactNode;
};

function isWelcomePath(pathname: string, segments: string[]) {
  return pathname === "/welcome" || segments.includes("welcome");
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const onboardingHydrated = useOnboardingStore((state) => state.hydrated);
  const onboardingComplete = useOnboardingStore((state) => state.complete);
  const localeHydrated = useLocaleStore((state) => state.hydrated);

  const isWelcomeRoute = isWelcomePath(pathname, segments);
  const isReady = onboardingHydrated && localeHydrated;
  const needsWelcome = isReady && !onboardingComplete && !isWelcomeRoute;

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (needsWelcome) {
      router.replace("/welcome");
      return;
    }

    if (onboardingComplete && isWelcomeRoute) {
      router.replace("/");
    }
  }, [isReady, needsWelcome, onboardingComplete, isWelcomeRoute, router]);

  if (!isReady || needsWelcome) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return children;
}

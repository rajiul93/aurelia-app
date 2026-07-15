import type { ReactNode } from "react";

import { PageBackground } from "@/components/page-background";
import { useAppContent } from "@/hooks/queries/use-app-content";
import { resolveAppBackgroundUrl } from "@/lib/app-content/resolve-asset";

type AppBackgroundProps = {
  children: ReactNode;
};

/**
 * App-wide mobile background image (same asset as Home). Lives once at the root
 * so every screen can stay transparent and share one photo without re-wrapping.
 */
export function AppBackground({ children }: AppBackgroundProps) {
  const { data } = useAppContent();
  const uri = resolveAppBackgroundUrl(data?.data.assets);

  return (
    <PageBackground uri={uri} imagePosition="right" noOverlay>
      {children}
    </PageBackground>
  );
}

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { useEntitlements } from "@/hooks/queries/use-entitlements";
import { hasActivePlan as computeHasActivePlan, isAccessActive } from "@/lib/entitlements/access";
import { refreshEntitlements } from "@/lib/entitlements/refresh";
import type { EntitledVersions } from "@/lib/bundle/version-compare";
import { useAuthStore } from "@/store/auth-store";
import { useEntitlementsStore } from "@/store/entitlements-store";

export type TourLockReason = "access_inactive" | "tour_not_entitled" | null;

export function useEntitlementStatus() {
  const queryClient = useQueryClient();
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const snapshot = useEntitlementsStore((state) => state.snapshot);
  const { isLoading, isFetching } = useEntitlements();

  // The persisted snapshot is the source of truth. The query exists only to
  // create it (or renew it once expired), so every access decision — including
  // the expiry check — resolves offline with no network call.
  const entitlements = snapshot?.entitlements;
  const isSignedIn = Boolean(sessionToken);

  const isActive = useMemo(
    () => !isSignedIn || isAccessActive(entitlements),
    [entitlements, isSignedIn],
  );

  // A real "has an active plan" signal, unlike `isActive` which is fail-open for
  // a signed-out visitor. Gates the Buy-Plan / Why-Buy sections.
  const hasActivePlan = useMemo(
    () => computeHasActivePlan(isSignedIn, entitlements),
    [entitlements, isSignedIn],
  );

  const entitledTourIds = useMemo(
    () => new Set(entitlements?.tours.map((tour) => tour.id) ?? []),
    [entitlements],
  );

  const entitledVersionsByTourId = useMemo(() => {
    const map = new Map<string, EntitledVersions>();

    for (const tour of entitlements?.tours ?? []) {
      map.set(tour.id, {
        tourBundleVersion: tour.tourBundleVersion,
        mediaVersion: tour.mediaVersion,
        aiKnowledgeVersion: tour.aiKnowledgeVersion,
        routeVersion: tour.routeVersion,
      });
    }

    return map;
  }, [entitlements]);

  const refetchAccess = useCallback(
    () => refreshEntitlements(queryClient),
    [queryClient],
  );

  function hasTour(tourId: string) {
    if (!isSignedIn) {
      return true;
    }

    if (!entitlements) {
      return true;
    }

    return entitledTourIds.has(tourId);
  }

  function getTourLockReason(tourId: string): TourLockReason {
    if (!isSignedIn) {
      return null;
    }

    if (isLoading && !entitlements) {
      return null;
    }

    if (!isActive) {
      return "access_inactive";
    }

    if (!hasTour(tourId)) {
      return "tour_not_entitled";
    }

    return null;
  }

  function isTourLocked(tourId: string) {
    return getTourLockReason(tourId) !== null;
  }

  function getEntitledVersions(tourId: string) {
    return entitledVersionsByTourId.get(tourId) ?? null;
  }

  return {
    isSignedIn,
    isActive,
    hasActivePlan,
    isLoadingAccess: isSignedIn && isLoading && !entitlements,
    isFetchingAccess: isFetching,
    entitlements,
    entitledVersionsByTourId,
    hasTour,
    isTourLocked,
    getTourLockReason,
    getEntitledVersions,
    refetchAccess,
  };
}

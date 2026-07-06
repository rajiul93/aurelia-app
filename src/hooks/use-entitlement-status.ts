import { useMemo } from "react";

import { useEntitlements } from "@/hooks/queries/use-entitlements";
import type { EntitledVersions } from "@/lib/bundle/version-compare";
import { useAuthStore } from "@/store/auth-store";
import type { Entitlements } from "@/types/auth";

export type TourLockReason = "access_inactive" | "tour_not_entitled" | null;

function isAccessActive(entitlements: Entitlements | undefined) {
  if (!entitlements) {
    return true;
  }

  if (entitlements.status !== "ACTIVE") {
    return false;
  }

  if (entitlements.expiresAt) {
    return new Date(entitlements.expiresAt).getTime() > Date.now();
  }

  return true;
}

export function useEntitlementStatus() {
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const {
    data: entitlementsResponse,
    isLoading,
    isFetching,
    refetch,
  } = useEntitlements();

  const entitlements = entitlementsResponse?.data;
  const isSignedIn = Boolean(sessionToken);

  const isActive = useMemo(
    () => !isSignedIn || isAccessActive(entitlements),
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
    isLoadingAccess: isSignedIn && isLoading && !entitlements,
    isFetchingAccess: isFetching,
    entitlements,
    entitledVersionsByTourId,
    hasTour,
    isTourLocked,
    getTourLockReason,
    getEntitledVersions,
    refetchAccess: refetch,
  };
}

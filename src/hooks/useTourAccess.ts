import { useEntitlementsStore } from "@/store/entitlements-store";
import type { Entitlements } from "@/types/auth";

export interface TourAccessStatus {
  isActive: boolean;
  expiresAt: string;
  maxDevices: number;
  allowSubscriptionFeatures: boolean;
}

export function useTourAccess(tourId: string) {
  const { snapshot, hydrated } = useEntitlementsStore();

  if (!hydrated) {
    return {
      data: null,
      isLoading: true,
      isError: false,
    };
  }

  if (!snapshot?.entitlements) {
    return {
      data: null,
      isLoading: false,
      isError: true,
    };
  }

  const entitlements = snapshot.entitlements;
  const tourAccess = checkTourAccess(tourId, entitlements);

  return {
    data: tourAccess,
    isLoading: false,
    isError: !tourAccess || !tourAccess.isActive,
  };
}

function checkTourAccess(
  tourId: string,
  entitlements: Entitlements
): TourAccessStatus | null {
  const now = new Date();
  const expiresAt = new Date(entitlements.expiresAt);

  // Check if entitlements haven't expired
  const isExpired = now >= expiresAt;
  if (isExpired) {
    return null;
  }

  // Check if this tour is in the entitlements
  const hasTour = entitlements.tours.some((t) => t.id === tourId);
  if (!hasTour) {
    return null;
  }

  return {
    isActive: entitlements.status === "ACTIVE",
    expiresAt: entitlements.expiresAt,
    maxDevices: entitlements.maxDevices,
    allowSubscriptionFeatures: entitlements.allowSubscriptionFeatures,
  };
}

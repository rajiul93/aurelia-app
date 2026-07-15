import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearEntitlementsSnapshot,
  loadEntitlementsSnapshot,
  saveEntitlementsSnapshot,
} from "@/lib/entitlements/storage";
import { useEntitlementsStore } from "@/store/entitlements-store";
import type { Entitlements } from "@/types/auth";

// Hoisted above the imports by Vitest, so the store sees the mocked storage.
vi.mock("@/lib/entitlements/storage", () => ({
  loadEntitlementsSnapshot: vi.fn(async () => null),
  saveEntitlementsSnapshot: vi.fn(async () => {}),
  clearEntitlementsSnapshot: vi.fn(async () => {}),
}));

const ENTITLEMENTS: Entitlements = {
  phone: "+8801712345678",
  email: null,
  status: "ACTIVE",
  activatedAt: "2020-01-01T00:00:00.000Z",
  expiresAt: "2026-12-01T00:00:00.000Z",
  maxDevices: 1,
  activeDeviceCount: 1,
  seatsRemaining: 1,
  allowSubscriptionFeatures: true,
  tours: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  useEntitlementsStore.setState({ snapshot: null, hydrated: false });
});

describe("entitlements-store", () => {
  it("hydrates the persisted snapshot so access resolves offline", async () => {
    vi.mocked(loadEntitlementsSnapshot).mockResolvedValueOnce({
      entitlements: ENTITLEMENTS,
      fetchedAt: "2026-07-01T00:00:00.000Z",
    });

    await useEntitlementsStore.getState().hydrate();

    expect(useEntitlementsStore.getState().snapshot?.entitlements).toEqual(
      ENTITLEMENTS,
    );
    expect(useEntitlementsStore.getState().hydrated).toBe(true);
  });

  it("settles hydrated even when nothing is stored", async () => {
    await useEntitlementsStore.getState().hydrate();

    expect(useEntitlementsStore.getState().snapshot).toBeNull();
    expect(useEntitlementsStore.getState().hydrated).toBe(true);
  });

  it("persists a fetched entitlements response", async () => {
    await useEntitlementsStore.getState().setEntitlements(ENTITLEMENTS);

    expect(saveEntitlementsSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ entitlements: ENTITLEMENTS }),
    );
    expect(useEntitlementsStore.getState().snapshot?.entitlements).toEqual(
      ENTITLEMENTS,
    );
  });

  it("clears the snapshot on sign-out", async () => {
    await useEntitlementsStore.getState().setEntitlements(ENTITLEMENTS);
    await useEntitlementsStore.getState().clear();

    expect(clearEntitlementsSnapshot).toHaveBeenCalled();
    expect(useEntitlementsStore.getState().snapshot).toBeNull();
  });
});

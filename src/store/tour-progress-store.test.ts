import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadTourProgressIndex,
  saveTourProgress,
} from "@/lib/tour-progress/storage";
import { useTourProgressStore } from "@/store/tour-progress-store";

// Hoisted above the imports by Vitest, so the store sees the mocked storage.
vi.mock("@/lib/tour-progress/storage", () => ({
  loadTourProgressIndex: vi.fn(async () => ({})),
  saveTourProgress: vi.fn(async () => {}),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useTourProgressStore.setState({ byTourId: {}, hydrated: false });
});

describe("tour-progress-store", () => {
  it("hydrates from persisted storage", async () => {
    vi.mocked(loadTourProgressIndex).mockResolvedValueOnce({
      t1: { completedSpotIds: ["s1"], updatedAt: "2026-01-01" },
    });

    await useTourProgressStore.getState().hydrate();

    const state = useTourProgressStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.isSpotComplete("t1", "s1")).toBe(true);
  });

  it("toggles a spot complete and back, persisting each change", async () => {
    const store = useTourProgressStore.getState();

    await store.toggleSpotComplete("t1", "s1");
    expect(useTourProgressStore.getState().isSpotComplete("t1", "s1")).toBe(true);
    expect(useTourProgressStore.getState().getCompletedCount("t1")).toBe(1);

    await useTourProgressStore.getState().toggleSpotComplete("t1", "s1");
    expect(useTourProgressStore.getState().isSpotComplete("t1", "s1")).toBe(false);
    expect(saveTourProgress).toHaveBeenCalledTimes(2);
  });

  it("markSpotComplete is idempotent (no duplicate save)", async () => {
    const store = useTourProgressStore.getState();

    await store.markSpotComplete("t1", "s1");
    await useTourProgressStore.getState().markSpotComplete("t1", "s1");

    expect(useTourProgressStore.getState().getCompletedCount("t1")).toBe(1);
    expect(saveTourProgress).toHaveBeenCalledTimes(1);
  });

  it("reports zero progress and non-completion for unknown tours", () => {
    const store = useTourProgressStore.getState();
    expect(store.getCompletedCount("missing")).toBe(0);
    expect(store.isSpotComplete("missing", "s1")).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadSpotBookmarksIndex,
  saveSpotBookmarksIndex,
} from "@/lib/spot-bookmarks/storage";
import { useSpotBookmarksStore } from "@/store/spot-bookmarks-store";

// Hoisted above the imports by Vitest, so the store sees the mocked storage.
vi.mock("@/lib/spot-bookmarks/storage", () => ({
  loadSpotBookmarksIndex: vi.fn(async () => ({})),
  saveSpotBookmarksIndex: vi.fn(async () => {}),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useSpotBookmarksStore.setState({ byTourId: {}, hydrated: false });
});

describe("spot-bookmarks-store", () => {
  it("hydrates persisted bookmarks", async () => {
    vi.mocked(loadSpotBookmarksIndex).mockResolvedValueOnce({ t1: ["s1", "s2"] });

    await useSpotBookmarksStore.getState().hydrate();

    const state = useSpotBookmarksStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.isBookmarked("t1", "s2")).toBe(true);
  });

  it("toggles a bookmark on and off, persisting the whole index", async () => {
    await useSpotBookmarksStore.getState().toggleBookmark("t1", "s1");
    expect(useSpotBookmarksStore.getState().isBookmarked("t1", "s1")).toBe(true);

    await useSpotBookmarksStore.getState().toggleBookmark("t1", "s1");
    expect(useSpotBookmarksStore.getState().isBookmarked("t1", "s1")).toBe(false);
    expect(saveSpotBookmarksIndex).toHaveBeenCalledTimes(2);
  });

  it("keeps bookmarks isolated per tour", async () => {
    await useSpotBookmarksStore.getState().toggleBookmark("t1", "s1");
    await useSpotBookmarksStore.getState().toggleBookmark("t2", "s9");

    const state = useSpotBookmarksStore.getState();
    expect(state.isBookmarked("t1", "s1")).toBe(true);
    expect(state.isBookmarked("t1", "s9")).toBe(false);
    expect(state.isBookmarked("t2", "s9")).toBe(true);
  });
});

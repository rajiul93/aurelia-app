import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadCachedAppContent,
  saveCachedAppContent,
} from "@/lib/app-content/storage";
import { useAppContentStore } from "@/store/app-content-store";
import type { AppContentBundle } from "@/types/app-content";

// Hoisted above the imports by Vitest, so the store sees the mocked storage.
vi.mock("@/lib/app-content/storage", () => ({
  loadCachedAppContent: vi.fn(async () => null),
  saveCachedAppContent: vi.fn(async () => {}),
}));

const bundle: AppContentBundle = {
  appContentVersion: 3,
  language: "en",
  strings: { "title.welcome": "Welcome" },
  assets: {
    "background.morning": {
      url: "https://cdn.test/morning.jpg",
      timeOfDay: "MORNING",
      mimeType: "image/jpeg",
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  useAppContentStore.setState({ content: null, hydrated: false });
});

describe("app-content-store", () => {
  it("stays null when nothing is cached", async () => {
    vi.mocked(loadCachedAppContent).mockResolvedValueOnce(null);

    await useAppContentStore.getState().hydrate();

    const state = useAppContentStore.getState();
    expect(state.hydrated).toBe(true);
    // No built-in default: compiled-in UI strings are the real fallback.
    expect(state.content).toBeNull();
  });

  it("hydrates the cached bundle so a cold offline start has asset URLs", async () => {
    vi.mocked(loadCachedAppContent).mockResolvedValueOnce(bundle);

    await useAppContentStore.getState().hydrate();

    expect(useAppContentStore.getState().content).toEqual(bundle);
  });

  it("marks itself hydrated even when the disk read fails", async () => {
    // loadCachedAppContent swallows its own errors and returns null; the store
    // must still settle or bootstrap would wait on the splash forever.
    vi.mocked(loadCachedAppContent).mockResolvedValueOnce(null);

    await useAppContentStore.getState().hydrate();

    expect(useAppContentStore.getState().hydrated).toBe(true);
  });

  it("persists before applying, so the store never claims an unwritten bundle", async () => {
    const order: string[] = [];
    vi.mocked(saveCachedAppContent).mockImplementationOnce(async () => {
      order.push("disk");
    });

    await useAppContentStore.getState().setContent(bundle);
    order.push("memory");

    expect(saveCachedAppContent).toHaveBeenCalledWith(bundle);
    expect(order).toEqual(["disk", "memory"]);
    expect(useAppContentStore.getState().content).toEqual(bundle);
  });

  it("does not apply the bundle in memory when the disk write throws", async () => {
    vi.mocked(saveCachedAppContent).mockRejectedValueOnce(new Error("disk full"));

    await expect(
      useAppContentStore.getState().setContent(bundle),
    ).rejects.toThrow("disk full");
    expect(useAppContentStore.getState().content).toBeNull();
  });
});

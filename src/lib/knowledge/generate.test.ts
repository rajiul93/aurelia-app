import { beforeEach, describe, expect, it, vi } from "vitest";

import { retrievePassages } from "@/lib/knowledge/assistant";
import { generateAnswer } from "@/lib/knowledge/generate";
import { getDeviceCapability } from "@/lib/llm/device-capability";
import { isGeminiAvailable, streamGeminiCompletion } from "@/lib/llm/gemini-runtime";
import {
  getLlamaContext,
  isLlamaNativeAvailable,
  streamCompletion,
} from "@/lib/llm/llama-runtime";
import { getInstalledModelPath } from "@/lib/llm/model-manager";
import type { SearchDocument } from "@/types/tour-bundle";

vi.mock("@/lib/llm/device-capability", () => ({
  getDeviceCapability: vi.fn(),
}));
vi.mock("@/lib/llm/llama-runtime", () => ({
  isLlamaNativeAvailable: vi.fn(),
  getLlamaContext: vi.fn(),
  streamCompletion: vi.fn(),
}));
vi.mock("@/lib/llm/gemini-runtime", () => ({
  isGeminiAvailable: vi.fn(),
  streamGeminiCompletion: vi.fn(),
}));
vi.mock("@/lib/llm/model-manager", () => ({
  getInstalledModelPath: vi.fn(),
}));
vi.mock("@/lib/knowledge/assistant", () => ({
  retrievePassages: vi.fn(),
}));

const passage: SearchDocument = {
  id: "doc-1",
  language: "en",
  audience: "ADULTS",
  type: "ai_knowledge",
  tourId: "tour-1",
  spotId: null,
  title: "The Colosseum",
  body: "Built in 80 AD.",
  keywords: "colosseum",
};

function request(overrides: Partial<Parameters<typeof generateAnswer>[0]> = {}) {
  return {
    question: "When was it built?",
    language: "en" as const,
    pack: null,
    tourDocuments: [passage],
    preferredTourId: null,
    provider: "gemma" as const,
    onToken: vi.fn(),
    ...overrides,
  };
}

/** Everything healthy — each test then breaks exactly one link. */
function primeHappyPath() {
  vi.mocked(getDeviceCapability).mockReturnValue({
    canRunModel: true,
    totalMemoryBytes: 8 * 1024 * 1024 * 1024,
    reason: null,
  });
  vi.mocked(isLlamaNativeAvailable).mockReturnValue(true);
  vi.mocked(getInstalledModelPath).mockReturnValue("file:///model.gguf");
  vi.mocked(retrievePassages).mockReturnValue([passage]);
  vi.mocked(getLlamaContext).mockResolvedValue({} as never);
  vi.mocked(streamCompletion).mockReturnValue({
    completion: Promise.resolve("It was built in 80 AD."),
    stop: vi.fn(),
  });
}

describe("generateAnswer fallback chain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    primeHappyPath();
  });

  it("generates when every precondition holds", async () => {
    const result = await generateAnswer(request());

    expect(result.started).toBe(true);
    if (result.started) {
      expect(await result.handle.completion).toBe("It was built in 80 AD.");
      expect(result.handle.sourceTourId).toBe("tour-1");
    }
  });


  it("skips on a device below the memory floor", async () => {
    vi.mocked(getDeviceCapability).mockReturnValue({
      canRunModel: false,
      totalMemoryBytes: 4 * 1024 * 1024 * 1024,
      reason: "low_memory",
    });

    const result = await generateAnswer(request());

    expect(result).toEqual({ started: false, reason: "device_incapable" });
    expect(getLlamaContext).not.toHaveBeenCalled();
  });

  it("skips when the native runtime is missing", async () => {
    vi.mocked(isLlamaNativeAvailable).mockReturnValue(false);

    const result = await generateAnswer(request());

    expect(result).toEqual({ started: false, reason: "runtime_missing" });
  });

  it("skips when no model has been downloaded", async () => {
    vi.mocked(getInstalledModelPath).mockReturnValue(null);

    const result = await generateAnswer(request());

    expect(result).toEqual({ started: false, reason: "model_missing" });
    expect(getLlamaContext).not.toHaveBeenCalled();
  });

  it("refuses to generate with nothing retrieved", async () => {
    vi.mocked(retrievePassages).mockReturnValue([]);

    const result = await generateAnswer(request());

    expect(result).toEqual({ started: false, reason: "no_passages" });
    // The hallucination guard. With no grounding the model would invent an
    // answer, so it must not even be loaded.
    expect(getLlamaContext).not.toHaveBeenCalled();
    expect(streamCompletion).not.toHaveBeenCalled();
  });

  it("skips when the context fails to load", async () => {
    vi.mocked(getLlamaContext).mockResolvedValue(null);

    const result = await generateAnswer(request());

    expect(result).toEqual({ started: false, reason: "context_failed" });
    expect(streamCompletion).not.toHaveBeenCalled();
  });

  it("passes only the retrieved passages to the prompt", async () => {
    const other: SearchDocument = { ...passage, id: "doc-2", tourId: "tour-2" };
    vi.mocked(retrievePassages).mockReturnValue([other]);

    await generateAnswer(request());

    const [, , userPrompt] = vi.mocked(streamCompletion).mock.calls[0]!;
    expect(userPrompt).toContain("Built in 80 AD.");
    expect(userPrompt).toContain("When was it built?");
  });
});

describe("generateAnswer Gemini provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(retrievePassages).mockReturnValue([passage]);
  });

  it("generates when Gemini key is available", async () => {
    vi.mocked(isGeminiAvailable).mockReturnValue(true);
    vi.mocked(streamGeminiCompletion).mockReturnValue({
      completion: Promise.resolve("It was built in 80 AD."),
      stop: vi.fn(),
    });

    const result = await generateAnswer(request({ provider: "gemini" }));

    expect(result.started).toBe(true);
    if (result.started) {
      expect(await result.handle.completion).toBe("It was built in 80 AD.");
      expect(result.handle.sourceTourId).toBe("tour-1");
    }
  });

  it("skips when Gemini key is missing", async () => {
    vi.mocked(isGeminiAvailable).mockReturnValue(false);

    const result = await generateAnswer(request({ provider: "gemini" }));

    expect(result).toEqual({ started: false, reason: "gemini_key_missing" });
    expect(streamGeminiCompletion).not.toHaveBeenCalled();
  });

  it("checks no-passages guard before checking Gemini availability", async () => {
    vi.mocked(retrievePassages).mockReturnValue([]);

    const result = await generateAnswer(request({ provider: "gemini" }));

    expect(result).toEqual({ started: false, reason: "no_passages" });
    expect(isGeminiAvailable).not.toHaveBeenCalled();
  });
});

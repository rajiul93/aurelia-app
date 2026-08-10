import { describe, expect, it } from "vitest";

import {
  buildSystemPrompt,
  buildUserPrompt,
  MAX_CONTEXT_PASSAGES,
} from "@/lib/llm/prompt";
import type { SearchDocument } from "@/types/tour-bundle";

function makeDocument(overrides: Partial<SearchDocument> = {}): SearchDocument {
  return {
    id: "doc-1",
    language: "en",
    audience: "ADULTS",
    type: "ai_knowledge",
    tourId: "tour-1",
    spotId: null,
    title: "The Colosseum",
    body: "Built in 80 AD. It seated 50,000 spectators.",
    keywords: "colosseum",
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("names the output language so English sources answer in the user's language", () => {
    expect(buildSystemPrompt("es")).toContain("Spanish");
    expect(buildSystemPrompt("fr")).toContain("French");
    expect(buildSystemPrompt("en")).toContain("English");
  });

  it("forbids outside knowledge and offers an explicit way to decline", () => {
    // The grounding contract: without both halves a model fills gaps from
    // pretraining, which on a paid heritage tour means inventing dates.
    const prompt = buildSystemPrompt("en");

    expect(prompt).toContain("ONLY");
    expect(prompt.toLowerCase()).toContain("do not have that information");
    expect(prompt.toLowerCase()).toContain("never guess");
  });

  describe("gemma provider (default)", () => {
    it("enforces length constraints for a 2048-token context", () => {
      const prompt = buildSystemPrompt("en");
      expect(prompt).toContain("two or three short sentences");
    });

    it("keeps the grounding contract in all providers", () => {
      const prompt = buildSystemPrompt("en", "gemma");
      expect(prompt).toContain("ONLY");
      expect(prompt.toLowerCase()).toContain("never guess");
    });
  });

  describe("gemini provider", () => {
    it("relaxes the length instruction for a larger context window", () => {
      const prompt = buildSystemPrompt("en", "gemini");
      expect(prompt).toContain("natural");
      expect(prompt).toContain("conversational reply");
      expect(prompt).not.toContain("two or three short");
    });

    it("maintains the grounding contract identically", () => {
      const prompt = buildSystemPrompt("en", "gemini");
      expect(prompt).toContain("ONLY");
      expect(prompt.toLowerCase()).toContain("never guess");
      expect(prompt.toLowerCase()).toContain("do not have that information");
    });
  });
});

describe("buildUserPrompt", () => {
  it("includes every passage and the question", () => {
    const prompt = buildUserPrompt("When was it built?", [
      makeDocument({ id: "a", title: "First", body: "Body one." }),
      makeDocument({ id: "b", title: "Second", body: "Body two." }),
    ]);

    expect(prompt).toContain("Passage 1 — First");
    expect(prompt).toContain("Body one.");
    expect(prompt).toContain("Passage 2 — Second");
    expect(prompt).toContain("Body two.");
    expect(prompt).toContain("Question: When was it built?");
  });

  describe("gemma provider (default)", () => {
    it("caps the passage count at 3 for a 2048-token context", () => {
      const documents = Array.from({ length: 6 }, (_, index) =>
        makeDocument({ id: `doc-${index}`, title: `Title ${index}` }),
      );

      const prompt = buildUserPrompt("Tell me about it", documents, "gemma");

      expect(prompt).toContain("Passage 3");
      expect(prompt).not.toContain("Passage 4");
    });

    it("truncates passages at 700 chars to fit the context window", () => {
      const long = "word ".repeat(2000);
      const prompt = buildUserPrompt("What is this?", [
        makeDocument({ body: long }),
      ], "gemma");

      expect(prompt).toContain("…");
      expect(prompt.length).toBeLessThan(1200);
    });
  });

  describe("gemini provider", () => {
    it("allows up to 5 passages for a larger context window", () => {
      const documents = Array.from({ length: 6 }, (_, index) =>
        makeDocument({ id: `doc-${index}`, title: `Title ${index}` }),
      );

      const prompt = buildUserPrompt("Tell me about it", documents, "gemini");

      expect(prompt).toContain("Passage 5");
      expect(prompt).not.toContain("Passage 6");
    });

    it("allows longer passages (2000 chars) per the expanded context", () => {
      const longBody =
        "This is a detailed historical passage. ".repeat(50) + "End.";
      const prompt = buildUserPrompt("What is this?", [
        makeDocument({ body: longBody }),
      ], "gemini");

      // The passage should not be truncated as aggressively.
      const passageContent = prompt.match(/Passage 1[\s\S]*?(?=Question:)/)?.[0] || "";
      expect(passageContent.length).toBeGreaterThan(500);
      expect(passageContent).toContain("End.");
    });
  });

  it("collapses whitespace so newline-heavy knowledge bodies do not waste tokens", () => {
    const prompt = buildUserPrompt("q", [
      makeDocument({ body: "One.\n\n\n   Two.\t\tThree." }),
    ]);

    expect(prompt).toContain("One. Two. Three.");
  });

  it("omits the title separator when a passage has no title", () => {
    const prompt = buildUserPrompt("q", [
      makeDocument({ title: "", body: "Untitled body." }),
    ]);

    expect(prompt).toContain("Passage 1:");
    expect(prompt).not.toContain("Passage 1 — ");
  });
});

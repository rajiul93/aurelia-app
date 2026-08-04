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
    // The grounding contract: without both halves a 1B model fills gaps from
    // pretraining, which on a paid heritage tour means inventing dates.
    const prompt = buildSystemPrompt("en");

    expect(prompt).toContain("ONLY");
    expect(prompt.toLowerCase()).toContain("do not have that information");
    expect(prompt.toLowerCase()).toContain("never guess");
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

  it("caps the passage count so the context window is not blown", () => {
    const documents = Array.from({ length: 6 }, (_, index) =>
      makeDocument({ id: `doc-${index}`, title: `Title ${index}` }),
    );

    const prompt = buildUserPrompt("Tell me about it", documents);

    expect(prompt).toContain(`Passage ${MAX_CONTEXT_PASSAGES}`);
    expect(prompt).not.toContain(`Passage ${MAX_CONTEXT_PASSAGES + 1}`);
  });

  it("truncates a long passage rather than letting it evict the others", () => {
    const long = "word ".repeat(2000);
    const prompt = buildUserPrompt("What is this?", [
      makeDocument({ body: long }),
    ]);

    expect(prompt).toContain("…");
    // Comfortably inside the 2048-token window with room for the answer.
    expect(prompt.length).toBeLessThan(1200);
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

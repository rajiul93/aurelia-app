import { describe, expect, it } from "vitest";

import { answerQuestion } from "./assistant";
import type { SearchDocument } from "@/types/tour-bundle";

function doc(
  overrides: Partial<SearchDocument> & { id: string },
): SearchDocument {
  return {
    language: "en",
    audience: "ADULTS",
    type: "ai_knowledge",
    tourId: "tour-1",
    spotId: null,
    title: "",
    body: "",
    keywords: "",
    ...overrides,
  };
}

describe("answerQuestion subject frame", () => {
  it("keeps a real subject, so a lifted sentence keeps its antecedent", () => {
    const arch = doc({
      id: "d1",
      title: "Arch of Constantine",
      body: "It was rebuilt in the 4th century using older reliefs.",
    });

    expect(answerQuestion("rebuilt arch", "en", null, [arch]).subject).toBe(
      "Arch of Constantine",
    );
  });

  it("drops a keyword-list title, which is authoring metadata", () => {
    // The greeting entry's title is the list of words meant to *trigger* it.
    // Rendered through `assistant.answerWithSubject` it printed that list in
    // front of every reply.
    const greeting = doc({
      id: "kb-1",
      title: "Hi, hello, hey, good morning, greetings",
      keywords: "Hi, hello, hey, good morning, greetings",
      body: "Ciao! I'm Aurelia, your Rome tour guide.",
    });

    expect(answerQuestion("hi", "en", null, [greeting]).subject).toBeNull();
  });

  it("answers a greeting with the entry itself and nothing else", () => {
    const greeting = doc({
      id: "kb-1",
      tourId: "",
      title: "Hi, hello, hey",
      keywords: "Hi, hello, hey",
      body: "Ciao! I'm Aurelia, your Rome tour guide. Ready to explore?",
    });
    const prose = doc({
      id: "d2",
      title: "Arch of Constantine",
      body: "To legitimize his rule, Constantine reused his predecessors' reliefs.",
    });

    const answer = answerQuestion("Hi", "en", null, [greeting, prose]);

    expect(answer.hasSources).toBe(true);
    expect(answer.reply).toBe(
      "Ciao! I'm Aurelia, your Rome tour guide. Ready to explore?",
    );
  });
});

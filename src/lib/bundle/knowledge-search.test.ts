import { describe, expect, it } from "vitest";

import {
  detectSmallTalk,
  formatKnowledgeReply,
  searchTourKnowledge,
} from "./knowledge-search";
import type { SearchDocument } from "@/types/tour-bundle";

function doc(overrides: Partial<SearchDocument> & { id: string }): SearchDocument {
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

describe("detectSmallTalk", () => {
  it("treats bare greetings as small talk", () => {
    for (const query of ["hi", "Hello", "hey!", "thanks", "bye", "ok"]) {
      expect(detectSmallTalk(query)).toBe(true);
    }
  });

  it("covers the Spanish and French greetings the app ships", () => {
    for (const query of ["hola", "gracias", "bonjour", "merci", "salut"]) {
      expect(detectSmallTalk(query)).toBe(true);
    }
  });

  it("does NOT swallow a real question that opens with thanks", () => {
    expect(detectSmallTalk("thanks, when was it built?")).toBe(false);
    expect(detectSmallTalk("hi where is the entrance")).toBe(false);
  });

  it("ignores empty input", () => {
    expect(detectSmallTalk("")).toBe(false);
    expect(detectSmallTalk("   ")).toBe(false);
  });
});

describe("searchTourKnowledge word boundaries", () => {
  const museum = doc({
    id: "d1",
    title: "Visiting",
    body: "This museum has a rich history and Roman architecture.",
    keywords: "visit",
  });

  it("does not match 'us' inside 'museum'", () => {
    // The regression that made a museum app match every mention of "museum"
    // for any query containing the word "us".
    expect(searchTourKnowledge([museum], "us", "en")).toEqual([]);
  });

  it("does not match 'hi' inside 'this' / 'history' / 'architecture'", () => {
    expect(searchTourKnowledge([museum], "hi", "en")).toEqual([]);
  });

  it("still matches a whole word", () => {
    expect(searchTourKnowledge([museum], "architecture", "en")).toHaveLength(1);
  });

  it("still matches across a singular/plural difference", () => {
    // Guards the plural tolerance: a bare \b boundary would break this.
    const temples = doc({ id: "d2", title: "Temples", body: "Two temples stand here." });

    expect(searchTourKnowledge([temples], "temple", "en")).toHaveLength(1);
    expect(searchTourKnowledge([temples], "temples", "en")).toHaveLength(1);
  });

  it("keeps short era terms usable", () => {
    // Why the token floor stays at >1 rather than >2.
    const dated = doc({ id: "d3", title: "Arena", body: "Completed in 80 AD." });

    expect(searchTourKnowledge([dated], "AD", "en")).toHaveLength(1);
  });
});

describe("formatKnowledgeReply", () => {
  it("returns an empty string when nothing matched", () => {
    expect(formatKnowledgeReply("anything", [])).toBe("");
  });

  it("combines facts spread across more than one document", () => {
    // formatKnowledgeReply used to read documents[0] only, discarding the other
    // two the ranker had already found.
    const first = doc({ id: "d1", title: "Arena", body: "The arena was built in 80 AD." });
    const second = doc({ id: "d2", title: "Arena", body: "The arena seated 50,000 people." });

    const reply = formatKnowledgeReply("when was the arena built and how many people", [
      first,
      second,
    ]);

    expect(reply).toContain("80 AD");
    expect(reply).toContain("50,000");
  });

  it("de-duplicates a sentence repeated across documents", () => {
    const sentence = "The arena was built in 80 AD.";
    const reply = formatKnowledgeReply("when was the arena built", [
      doc({ id: "d1", title: "Arena", body: sentence }),
      doc({ id: "d2", title: "Arena FAQ", body: sentence }),
    ]);

    expect(reply).toBe(sentence);
  });

  it("ends on a sentence boundary instead of mid-word", () => {
    const long = doc({
      id: "d1",
      title: "Arena",
      body: `${"The arena was built by Roman engineers in 80 AD. ".repeat(20)}`,
    });

    const reply = formatKnowledgeReply("arena built", [long]);

    expect(reply.length).toBeLessThanOrEqual(480);
    expect(reply.endsWith("…")).toBe(false);
    expect(reply.endsWith(".")).toBe(true);
  });

  it("leaves a name question to the caller's localized template", () => {
    // Used to return a hardcoded English `It is called {title}.` that Spanish
    // and French users received verbatim.
    const reply = formatKnowledgeReply("what is this called", [
      doc({ id: "d1", title: "Arch of Constantine", body: "It stands near the arena." }),
    ]);

    expect(reply).toBe("");
  });
});

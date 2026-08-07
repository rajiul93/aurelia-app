import { describe, expect, it } from "vitest";

import { formatKnowledgeReply, searchTourKnowledge } from "./knowledge-search";
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

  it("does not let the plural tolerance turn 'hi' into 'his'", () => {
    // The plural tolerance added for temple/temples also matched hi→his, so
    // every line of Roman prose scored for a greeting and "Hi" was answered
    // with an arch. Fails if MIN_PLURAL_STEM_LENGTH is dropped back to 0.
    const prose = doc({
      id: "d4",
      title: "Arch of Constantine",
      body: "To legitimize his rule, Constantine reused his predecessors' reliefs.",
    });

    expect(searchTourKnowledge([prose], "hi", "en")).toEqual([]);
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

  it("returns a short entry whole when the match came from its keywords", () => {
    // A greeting matches on title/keywords, never in the body, so the old
    // "best sentence" fallback replied with just "Ciao!".
    const greeting = doc({
      id: "kb-1",
      title: "Hi, hello, hey, greetings",
      keywords: "Hi, hello, hey, greetings",
      body: "Ciao! I'm Aurelia, your Rome tour guide. Ready to explore?",
    });

    expect(formatKnowledgeReply("hi", [greeting])).toBe(
      "Ciao! I'm Aurelia, your Rome tour guide. Ready to explore?",
    );
  });

  it("never quotes a supporting document that has no query term", () => {
    // Only the top-ranked document may fall back to quoting a body that
    // matched on title/keywords alone; doing it for every document is what
    // appended an unrelated passage to the greeting.
    const greeting = doc({
      id: "kb-1",
      title: "Hi, hello, hey",
      keywords: "Hi, hello, hey",
      body: "Ciao! I'm Aurelia, your Rome tour guide.",
    });
    const unrelated = doc({
      id: "d2",
      title: "Arch of Constantine",
      body: "Constantine reused marble reliefs from earlier emperors.",
    });

    const reply = formatKnowledgeReply("hi", [greeting, unrelated]);

    expect(reply).toContain("Aurelia");
    expect(reply).not.toContain("Constantine");
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

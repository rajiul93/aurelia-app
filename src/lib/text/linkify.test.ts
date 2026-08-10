import { describe, expect, it } from "vitest";

import { splitTextWithLinks } from "@/lib/text/linkify";

describe("splitTextWithLinks", () => {
  it("returns plain text unchanged when there is no URL", () => {
    expect(splitTextWithLinks("The Colosseum opened in 80 AD.")).toEqual([
      { type: "text", value: "The Colosseum opened in 80 AD." },
    ]);
  });

  it("extracts a bare URL", () => {
    expect(splitTextWithLinks("https://example.com/tickets")).toEqual([
      { type: "link", value: "https://example.com/tickets" },
    ]);
  });

  it("extracts a URL embedded in a sentence", () => {
    expect(
      splitTextWithLinks("Book tickets at https://example.com/tickets today"),
    ).toEqual([
      { type: "text", value: "Book tickets at " },
      { type: "link", value: "https://example.com/tickets" },
      { type: "text", value: " today" },
    ]);
  });

  it("strips trailing sentence punctuation from the link", () => {
    expect(
      splitTextWithLinks("Visit https://example.com/tickets."),
    ).toEqual([
      { type: "text", value: "Visit " },
      { type: "link", value: "https://example.com/tickets" },
      { type: "text", value: "." },
    ]);
  });

  it("strips trailing punctuation when the URL is inside parentheses", () => {
    expect(
      splitTextWithLinks("More info here (https://example.com/info)."),
    ).toEqual([
      { type: "text", value: "More info here (" },
      { type: "link", value: "https://example.com/info" },
      { type: "text", value: ")." },
    ]);
  });

  it("handles multiple URLs in the same message", () => {
    expect(
      splitTextWithLinks("See https://a.com or https://b.com for details"),
    ).toEqual([
      { type: "text", value: "See " },
      { type: "link", value: "https://a.com" },
      { type: "text", value: " or " },
      { type: "link", value: "https://b.com" },
      { type: "text", value: " for details" },
    ]);
  });

  it("does not treat a bare domain (no scheme) as a link", () => {
    expect(splitTextWithLinks("Visit example.com for details")).toEqual([
      { type: "text", value: "Visit example.com for details" },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(splitTextWithLinks("")).toEqual([]);
  });
});

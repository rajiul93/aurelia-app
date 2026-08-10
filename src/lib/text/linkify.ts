const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/**
 * Punctuation that commonly trails a URL in prose ("visit https://x.com.")
 * but isn't part of the URL itself. Stripped from the link so the tap target
 * doesn't include a stray period, and re-attached as plain text after it.
 */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

export type TextSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string };

function splitTrailingPunctuation(url: string): [string, string] {
  const match = url.match(TRAILING_PUNCTUATION);
  if (!match) {
    return [url, ""];
  }

  return [url.slice(0, -match[0].length), match[0]];
}

const STARTS_WITH_URL = /^https?:\/\//;

/**
 * Split message text into plain-text and link segments, in order.
 *
 * `String.split` with a capturing group interleaves [text, match, text,
 * match, ...] — every other element is one of our matches — so a plain
 * (non-global) prefix check is enough to tell them apart, no regex-state
 * tracking needed.
 */
export function splitTextWithLinks(content: string): TextSegment[] {
  const parts = content.split(URL_PATTERN);
  const segments: TextSegment[] = [];

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (!STARTS_WITH_URL.test(part)) {
      segments.push({ type: "text", value: part });
      continue;
    }

    const [url, trailing] = splitTrailingPunctuation(part);
    if (url) {
      segments.push({ type: "link", value: url });
    }
    if (trailing) {
      segments.push({ type: "text", value: trailing });
    }
  }

  return segments;
}

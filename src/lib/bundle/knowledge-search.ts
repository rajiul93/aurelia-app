import type { SearchDocument } from "@/types/tour-bundle";
import type { AppLanguage } from "@/store/locale-store";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "know",
  "me",
  "my",
  "of",
  "on",
  "or",
  "tell",
  "that",
  "the",
  "this",
  "to",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "you",
  "your",
]);

type QuestionIntent =
  | "name"
  | "area"
  | "location"
  | "when"
  | "why"
  | "general";

const MAX_REPLY_LENGTH = 480;

/**
 * Greetings/thanks in the three shipped languages. Matched only on very short
 * queries (see `detectSmallTalk`) so "thanks, when was it built?" still runs a
 * real search.
 */
const SMALL_TALK = new Set([
  "hi",
  "hii",
  "hey",
  "hello",
  "yo",
  "thanks",
  "thank",
  "thankyou",
  "ty",
  "bye",
  "goodbye",
  "ok",
  "okay",
  "hola",
  "gracias",
  "adios",
  "adiós",
  "buenas",
  "bonjour",
  "salut",
  "merci",
  "coucou",
  "revoir",
]);

const SMALL_TALK_MAX_TOKENS = 3;

function rawTokens(value: string) {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * True when the query is a bare greeting rather than a question.
 *
 * Without this, "hi" reaches the ranker and — because scoring used to be a raw
 * substring test — matched t·hi·s / ·hi·story / arc·hi·tecture in essentially
 * every heritage document, so a greeting returned a random passage.
 *
 * The token cap is what keeps it honest: every token must be small talk AND the
 * query must be short, so a real question that merely opens with "thanks" is
 * still searched.
 */
export function detectSmallTalk(query: string) {
  const tokens = rawTokens(query);

  if (tokens.length === 0 || tokens.length > SMALL_TALK_MAX_TOKENS) {
    return false;
  }

  return tokens.every((token) => SMALL_TALK.has(token));
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Word-boundary matcher for one search term, tolerating a simple plural.
 *
 * Scoring used to be `body.includes(term)`, which made "us" match "m·us·eum"
 * and "hi" match "history" — junk ranking on a corpus that is mostly prose.
 * A bare `\b` fixes that but would regress recall ("temple" would stop matching
 * "temples"), so the singular/plural pair is matched explicitly.
 *
 * Built once per term per query and reused across every document and field —
 * compiling per (term × document × field) would cost far more than the
 * `includes` this replaces.
 */
function termMatcher(term: string) {
  const singular = term.endsWith("s") ? term.slice(0, -1) : term;
  const stem = escapeRegExp(singular);

  return new RegExp(`(?<![\\p{L}\\p{N}])${stem}(?:e?s)?(?![\\p{L}\\p{N}])`, "iu");
}

function buildMatchers(terms: string[]) {
  return terms.map((term) => termMatcher(term));
}

function detectQuestionIntent(query: string): QuestionIntent {
  const normalized = query.toLowerCase();

  if (/\b(name|called|title|known as)\b/.test(normalized)) {
    return "name";
  }

  if (
    /\b(area|size|how big|how large|how much land|square|hectare|acre|km|kilometer|mile)\b/.test(
      normalized,
    )
  ) {
    return "area";
  }

  if (/\b(where|location|located|place|situated|find)\b/.test(normalized)) {
    return "location";
  }

  if (/\b(when|year|date|founded|built|established|created)\b/.test(normalized)) {
    return "when";
  }

  if (/\b(why|reason|purpose|important|significance)\b/.test(normalized)) {
    return "why";
  }

  return "general";
}

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function scoreSentence(
  sentence: string,
  matchers: RegExp[],
  intent: QuestionIntent,
) {
  let score = 0;

  for (const matcher of matchers) {
    if (matcher.test(sentence)) {
      score += 4;
    }
  }

  switch (intent) {
    case "name":
      if (/\b(is|called|known as|named|refers to)\b/i.test(sentence)) {
        score += 8;
      }
      break;
    case "area":
      if (
        /\b\d[\d,.]*\s*(km|kilometer|mile|hectare|acre|sq|square|million)\b/i.test(
          sentence,
        )
      ) {
        score += 14;
      }
      if (/\b(area|covers|covering|spans|extends|size|largest|acres|hectares)\b/i.test(
        sentence,
      )) {
        score += 10;
      }
      break;
    case "location":
      if (
        /\b(located|lies in|found in|situated|in the|between|near|delta|region|country|coast)\b/i.test(
          sentence,
        )
      ) {
        score += 10;
      }
      break;
    case "when":
      if (/\b\d{3,4}\b/.test(sentence)) {
        score += 10;
      }
      if (/\b(when|year|since|founded|established|built|opened)\b/i.test(sentence)) {
        score += 8;
      }
      break;
    case "why":
      if (/\b(because|so that|helps|protects|important|role|significance|reason)\b/i.test(
        sentence,
      )) {
        score += 10;
      }
      break;
    default:
      break;
  }

  return score;
}

function pickBestSentences(
  body: string,
  query: string,
  intent: QuestionIntent,
  limit = 2,
) {
  const matchers = buildMatchers(tokenize(query));
  const ranked = splitIntoSentences(body)
    .map((sentence) => ({
      sentence,
      score: scoreSentence(sentence, matchers, intent),
    }))
    .sort((left, right) => right.score - left.score);

  const relevant = ranked.filter((entry) => entry.score > 0).slice(0, limit);

  if (relevant.length > 0) {
    return relevant.map((entry) => entry.sentence);
  }

  return ranked.slice(0, 1).map((entry) => entry.sentence);
}

/**
 * Trim to the budget on a sentence boundary.
 *
 * The old version sliced at an exact character count, so replies routinely
 * ended mid-word with an ellipsis. Falling back to the hard cut only matters
 * when a single sentence is itself over budget.
 */
function trimReply(text: string) {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_REPLY_LENGTH) {
    return trimmed;
  }

  const sentences = splitIntoSentences(trimmed);
  const kept: string[] = [];
  let length = 0;

  for (const sentence of sentences) {
    const next = length === 0 ? sentence.length : length + 1 + sentence.length;
    if (next > MAX_REPLY_LENGTH) {
      break;
    }
    kept.push(sentence);
    length = next;
  }

  if (kept.length > 0) {
    return kept.join(" ");
  }

  return `${trimmed.slice(0, MAX_REPLY_LENGTH - 1).trimEnd()}…`;
}

/**
 * Sentences from one document, best first.
 *
 * A name question ("what is this called?") is answered by the title alone, so
 * it returns nothing here and the caller renders its own localized template —
 * this used to build a hardcoded English `It is called {title}.`, which
 * Spanish and French users received verbatim.
 */
function sentencesFromDocument(document: SearchDocument, query: string) {
  const intent = detectQuestionIntent(query);

  if (
    intent === "name" &&
    document.title.trim() &&
    /\b(name|called|title|what is this|what's this)\b/i.test(query)
  ) {
    return [];
  }

  const sentences = pickBestSentences(
    document.body,
    query,
    intent,
    intent === "name" ? 1 : 2,
  );

  if (sentences.length > 0) {
    return sentences;
  }

  const fallback = document.body.trim();
  const first = fallback.split(/\n+/u)[0] ?? fallback;
  return first ? [first] : [];
}

function normalizeForDedupe(sentence: string) {
  return sentence.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function scoreDocument(document: SearchDocument, matchers: RegExp[]) {
  let score = 0;

  for (const matcher of matchers) {
    if (matcher.test(document.title)) {
      score += 12;
    }

    if (matcher.test(document.keywords)) {
      score += 8;
    }

    if (matcher.test(document.body)) {
      score += 3;
    }
  }

  return score;
}

function rankDocuments(documents: SearchDocument[], query: string) {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return [] as SearchDocument[];
  }

  const matchers = buildMatchers(terms);

  return documents
    .map((document) => ({
      document,
      score: scoreDocument(document, matchers),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((entry) => entry.document);
}

function searchInLanguage(
  documents: SearchDocument[],
  query: string,
  language: AppLanguage | null,
  audience?: string,
) {
  const scoped = documents.filter((document) => {
    if (language && document.language !== language) {
      return false;
    }

    if (audience && document.audience !== audience) {
      return false;
    }

    return true;
  });

  return rankDocuments(scoped, query);
}

export function searchTourKnowledge(
  documents: SearchDocument[],
  query: string,
  language: AppLanguage,
  audience?: string,
) {
  const primary = searchInLanguage(documents, query, language, audience);
  if (primary.length > 0) {
    return primary;
  }

  return searchInLanguage(documents, query, language);
}

/**
 * Compose a reply from the ranked documents, best first.
 *
 * This used to read `documents[0]` only, discarding the other two the ranker
 * had already found — so a fact spread across two entries could never be
 * combined. Sentences are de-duplicated because the same fact often appears in
 * both a spot description and its FAQ.
 *
 * Callers must handle the no-match case themselves: this returns "" rather than
 * a hardcoded English miss message, so the caller can show a translated string.
 */
export function formatKnowledgeReply(
  query: string,
  documents: SearchDocument[],
) {
  if (documents.length === 0) {
    return "";
  }

  const seen = new Set<string>();
  const collected: string[] = [];

  for (const document of documents) {
    for (const sentence of sentencesFromDocument(document, query)) {
      const key = normalizeForDedupe(sentence);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      collected.push(sentence);
    }
  }

  return trimReply(collected.join(" "));
}

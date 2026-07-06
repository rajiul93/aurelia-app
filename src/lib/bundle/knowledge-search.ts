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

const MAX_REPLY_LENGTH = 320;

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
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
  terms: string[],
  intent: QuestionIntent,
) {
  const lower = sentence.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (lower.includes(term)) {
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
  const terms = tokenize(query);
  const ranked = splitIntoSentences(body)
    .map((sentence) => ({
      sentence,
      score: scoreSentence(sentence, terms, intent),
    }))
    .sort((left, right) => right.score - left.score);

  const relevant = ranked.filter((entry) => entry.score > 0).slice(0, limit);

  if (relevant.length > 0) {
    return relevant.map((entry) => entry.sentence);
  }

  return ranked.slice(0, 1).map((entry) => entry.sentence);
}

function trimReply(text: string) {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_REPLY_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_REPLY_LENGTH - 1).trimEnd()}…`;
}

function answerNameQuestion(document: SearchDocument, query: string) {
  const title = document.title.trim();

  if (title && /\b(name|called|title|what is this|what's this)\b/i.test(query)) {
    return trimReply(`It is called ${title}.`);
  }

  const sentences = pickBestSentences(document.body, query, "name", 1);
  if (sentences[0]) {
    return trimReply(sentences[0]!);
  }

  return title ? trimReply(`It is called ${title}.`) : trimReply(document.body);
}

function answerFromDocument(document: SearchDocument, query: string) {
  const intent = detectQuestionIntent(query);

  if (intent === "name") {
    return answerNameQuestion(document, query);
  }

  const sentences = pickBestSentences(document.body, query, intent, 2);
  if (sentences.length > 0) {
    return trimReply(sentences.join(" "));
  }

  const fallback = document.body.trim();
  return trimReply(fallback.split(/\n+/u)[0] ?? fallback);
}

function scoreDocument(document: SearchDocument, terms: string[]) {
  const title = document.title.toLowerCase();
  const body = document.body.toLowerCase();
  const keywords = document.keywords.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (title.includes(term)) {
      score += 12;
    }

    if (keywords.includes(term)) {
      score += 8;
    }

    if (body.includes(term)) {
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

  return documents
    .map((document) => ({
      document,
      score: scoreDocument(document, terms),
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

export function formatKnowledgeReply(
  query: string,
  documents: SearchDocument[],
) {
  if (documents.length === 0) {
    return "I couldn't find that in your offline guide yet. Try different words or browse the tour stops.";
  }

  return answerFromDocument(documents[0]!, query);
}

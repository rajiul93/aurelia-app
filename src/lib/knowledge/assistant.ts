import {
  formatKnowledgeReply,
  searchTourKnowledge,
} from "@/lib/bundle/knowledge-search";
import type { AppLanguage } from "@/store/locale-store";
import type { KnowledgePack, LocalizedText } from "@/types/knowledge";
import type { SearchDocument } from "@/types/tour-bundle";

/**
 * Text in the active language, falling back to English.
 *
 * Without the fallback an untranslated FAQ drops out of the corpus entirely, so
 * a Spanish or French user could get "no answer" for everything while the same
 * question worked in English. Mirrors the fallback `use-knowledge.ts` already
 * applies to the FAQ and info-page screens.
 */
function localized(text: LocalizedText, language: AppLanguage) {
  return text[language]?.trim() || text.en?.trim() || "";
}

/**
 * Build language-scoped search documents from the FAQ + Knowledge Base so the
 * existing offline ranking engine can answer questions. This is the Phase-1
 * (retrieval) implementation of the assistant; a generative on-device model
 * (Gemma 3 1B) can later replace the body of `answerQuestion` without changing
 * callers.
 */
function buildDocuments(
  pack: KnowledgePack,
  language: AppLanguage,
): SearchDocument[] {
  const documents: SearchDocument[] = [];

  for (const faq of pack.faqs) {
    const question = localized(faq.question, language);
    const answer = localized(faq.answerText, language);
    if (!question && !answer) {
      continue;
    }
    documents.push({
      id: `faq-${faq.id}`,
      language,
      audience: "ADULTS",
      type: "ai_knowledge",
      tourId: "",
      spotId: null,
      title: question,
      body: answer,
      keywords: question,
    });
  }

  for (const article of pack.knowledge) {
    const title = localized(article.title, language);
    const body = localized(article.bodyText, language);
    if (!title && !body) {
      continue;
    }
    documents.push({
      id: `kb-${article.id}`,
      language,
      audience: "ADULTS",
      type: "ai_knowledge",
      tourId: "",
      spotId: null,
      title,
      body,
      keywords: title,
    });
  }

  return documents;
}

export type AssistantAnswer = {
  reply: string;
  hasSources: boolean;
  /** Tour the winning document came from; "" / null for global pack entries. */
  sourceTourId: string | null;
  /**
   * What kind of reply this is, so the caller can render the right localized
   * string. These modules are pure and have no access to `t()` — returning the
   * intent instead of the text is what keeps them testable, and what stops the
   * hardcoded-English bugs this file has had twice before.
   */
  kind: "answer" | "none";
  /**
   * Winning document title, for the caller's frame template. A sentence lifted
   * out of a body loses its antecedent ("It was rebuilt in the 3rd century." —
   * what was?), so the caller re-attaches the subject.
   */
  subject: string | null;
};

/** Longest title still readable as a subject in front of an answer. */
const MAX_SUBJECT_LENGTH = 60;

/**
 * The winning document's title, but only when it reads as a *subject*.
 *
 * The frame exists to restore the antecedent a lifted sentence lost ("It was
 * rebuilt in the 3rd century." — what was?). A Knowledge Base entry whose title
 * is the list of words meant to trigger it ("Hi, hello, hey, good morning, …")
 * is not a subject, and printing it in front of the answer is noise — that list
 * is authoring metadata, not something a visitor should ever read.
 */
function subjectFrom(document: SearchDocument | undefined) {
  const title = document?.title?.trim();

  if (!title || title.includes(",") || title.length > MAX_SUBJECT_LENGTH) {
    return null;
  }

  return title;
}

const NO_ANSWER: AssistantAnswer = {
  reply: "",
  hasSources: false,
  sourceTourId: null,
  kind: "none",
  subject: null,
};

/**
 * Search in the active language, retrying in English.
 *
 * Tour documents only exist for languages that were actually translated, so
 * without the retry a tour written only in English is unanswerable while the app
 * is set to Spanish or French.
 */
function search(
  documents: SearchDocument[],
  query: string,
  language: AppLanguage,
) {
  if (documents.length === 0) {
    return [];
  }

  const matches = searchTourKnowledge(documents, query, language);

  if (matches.length > 0 || language === "en") {
    return matches;
  }

  return searchTourKnowledge(documents, query, "en");
}

/**
 * Rank the corpus for a question and return the winning passages, best first.
 *
 * Split out of `answerQuestion` so the generative path (`knowledge/generate.ts`)
 * retrieves through exactly the same logic. Two rankers would drift, and the
 * one feeding the model is the one that decides what it is allowed to say.
 */
export function retrievePassages(
  query: string,
  language: AppLanguage,
  pack: KnowledgePack | null,
  tourDocuments: SearchDocument[] = [],
  preferredTourId?: string | null,
): SearchDocument[] {
  const packDocuments = pack ? buildDocuments(pack, language) : [];
  const documents = [...packDocuments, ...tourDocuments];

  if (documents.length === 0) {
    return [];
  }

  // Asked from inside a tour, that tour answers first — otherwise a question
  // about "this room" could be answered by a different tour that happens to
  // score higher. Only when it has nothing does the rest of the corpus run.
  let matches: SearchDocument[] = [];

  if (preferredTourId) {
    matches = search(
      tourDocuments.filter((document) => document.tourId === preferredTourId),
      query,
      language,
    );
  }

  if (matches.length === 0) {
    matches = search(documents, query, language);
  }

  return matches;
}

export function answerQuestion(
  query: string,
  language: AppLanguage,
  pack: KnowledgePack | null,
  tourDocuments: SearchDocument[] = [],
  preferredTourId?: string | null,
): AssistantAnswer {
  const matches = retrievePassages(
    query,
    language,
    pack,
    tourDocuments,
    preferredTourId,
  );

  if (matches.length === 0) {
    // Deliberately empty rather than a hardcoded English miss message, so the
    // caller can show its own translated string.
    return NO_ANSWER;
  }

  return {
    reply: formatKnowledgeReply(query, matches),
    hasSources: true,
    sourceTourId: matches[0]?.tourId || null,
    kind: "answer",
    subject: subjectFrom(matches[0]),
  };
}

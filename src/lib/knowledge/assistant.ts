import {
  formatKnowledgeReply,
  searchTourKnowledge,
} from "@/lib/bundle/knowledge-search";
import type { AppLanguage } from "@/store/locale-store";
import type { KnowledgePack } from "@/types/knowledge";
import type { SearchDocument } from "@/types/tour-bundle";

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
    const question = faq.question[language]?.trim();
    const answer = faq.answerText[language]?.trim();
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
      title: question ?? "",
      body: answer ?? "",
      keywords: question ?? "",
    });
  }

  for (const article of pack.knowledge) {
    const title = article.title[language]?.trim();
    const body = article.bodyText[language]?.trim();
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
      title: title ?? "",
      body: body ?? "",
      keywords: title ?? "",
    });
  }

  return documents;
}

export type AssistantAnswer = {
  reply: string;
  hasSources: boolean;
};

export function answerQuestion(
  query: string,
  language: AppLanguage,
  pack: KnowledgePack | null,
): AssistantAnswer {
  if (!pack) {
    return { reply: "", hasSources: false };
  }

  const documents = buildDocuments(pack, language);
  const matches = searchTourKnowledge(documents, query, language);

  return {
    reply: formatKnowledgeReply(query, matches),
    hasSources: matches.length > 0,
  };
}

import type { AppLanguage } from "@/store/locale-store";
import type { BundleAiKnowledge, BundleContent } from "@/types/bundle-content";
import type { SearchDocument } from "@/types/tour-bundle";

export function buildSearchDocumentsFromContent(
  content: BundleContent,
): SearchDocument[] {
  const documents: SearchDocument[] = [];
  const tourId = content.tour.id;

  for (const translation of content.tour.translations) {
    documents.push({
      id: `tour:${tourId}:${translation.language}:${translation.audience ?? "ADULTS"}`,
      language: translation.language,
      audience: translation.audience ?? "ADULTS",
      type: "tour",
      tourId,
      spotId: null,
      title: translation.title,
      body: translation.description,
      keywords: content.tour.slug,
    });
  }

  for (const spot of content.tour.spots) {
    for (const translation of spot.translations) {
      documents.push({
        id: `spot:${spot.id}:${translation.language}:${translation.audience ?? "ADULTS"}`,
        language: translation.language,
        audience: translation.audience ?? "ADULTS",
        type: "spot",
        tourId,
        spotId: spot.id,
        title: translation.title,
        body: [translation.shortDesc, translation.descriptionText]
          .filter(Boolean)
          .join("\n"),
        keywords: "",
      });
    }

    for (const faq of spot.faqs) {
      for (const translation of faq.translations) {
        if (!translation.question || !translation.answerText) {
          continue;
        }

        documents.push({
          id: `spot_faq:${faq.id}:${translation.language}:${translation.audience ?? "ADULTS"}`,
          language: translation.language,
          audience: translation.audience ?? "ADULTS",
          type: "spot_faq",
          tourId,
          spotId: spot.id,
          title: translation.question,
          body: translation.answerText,
          keywords: "",
        });
      }
    }
  }

  for (const knowledge of content.aiKnowledge ?? []) {
    documents.push(...buildAiKnowledgeDocuments(tourId, knowledge));
  }

  return documents;
}

function buildAiKnowledgeDocuments(
  tourId: string,
  knowledge: BundleAiKnowledge,
): SearchDocument[] {
  return knowledge.translations.map((translation) => ({
    id: `ai_knowledge:${knowledge.id}:${translation.language}:${translation.audience ?? "ADULTS"}`,
    language: translation.language as AppLanguage,
    audience: translation.audience ?? "ADULTS",
    type: "ai_knowledge" as const,
    tourId,
    spotId: knowledge.spotId,
    title: translation.title || translation.content.slice(0, 80),
    body: translation.content,
    keywords: translation.keywords,
  }));
}

export function mergeSearchDocuments(
  primary: SearchDocument[],
  supplemental: SearchDocument[],
) {
  const byId = new Map<string, SearchDocument>();

  for (const document of primary) {
    byId.set(document.id, document);
  }

  for (const document of supplemental) {
    byId.set(document.id, document);
  }

  return [...byId.values()];
}

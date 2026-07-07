import { useMemo } from "react";

import { useLocaleStore } from "@/store/locale-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import type { KnowledgePackArticle } from "@/types/knowledge";

function localizedTitle(article: KnowledgePackArticle, language: "en" | "es" | "fr") {
  return article.title[language]?.trim() || article.title.en || article.key;
}

function localizedBodyHtml(
  article: KnowledgePackArticle,
  language: "en" | "es" | "fr",
) {
  return article.bodyHtml[language]?.trim() || article.bodyHtml.en || "";
}

function localizedBodyText(
  article: KnowledgePackArticle,
  language: "en" | "es" | "fr",
) {
  return article.bodyText[language]?.trim() || article.bodyText.en || "";
}

/** FAQ entries localized to the active app language. */
export function useKnowledgeFaqs() {
  const language = useLocaleStore((state) => state.language);
  const pack = useKnowledgeStore((state) => state.pack);

  return useMemo(() => {
    if (!pack) {
      return [];
    }
    return pack.faqs.map((faq) => ({
      id: faq.id,
      categoryTitle:
        faq.categoryTitle[language]?.trim() || faq.categoryTitle.en || "",
      question: faq.question[language]?.trim() || faq.question.en || "",
      answerHtml: faq.answerHtml[language]?.trim() || faq.answerHtml.en || "",
      answerText: faq.answerText[language]?.trim() || faq.answerText.en || "",
    }));
  }, [pack, language]);
}

/** Info + legal pages (drawer entries) localized to the active language. */
export function useKnowledgePages() {
  const language = useLocaleStore((state) => state.language);
  const pack = useKnowledgeStore((state) => state.pack);

  return useMemo(() => {
    if (!pack) {
      return [];
    }
    return [...pack.pages]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((page) => ({
        key: page.key,
        category: page.category,
        icon: page.icon,
        title: localizedTitle(page, language),
        bodyHtml: localizedBodyHtml(page, language),
        bodyText: localizedBodyText(page, language),
      }));
  }, [pack, language]);
}

export function useKnowledgePage(key: string) {
  const pages = useKnowledgePages();
  return pages.find((page) => page.key === key) ?? null;
}

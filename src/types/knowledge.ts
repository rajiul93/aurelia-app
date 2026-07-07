import type { AppLanguage } from "@/store/locale-store";

export type LocalizedText = Record<AppLanguage, string>;

export type KnowledgePackFaq = {
  id: string;
  categoryId: string;
  categoryTitle: LocalizedText;
  question: LocalizedText;
  answerText: LocalizedText;
  answerHtml: LocalizedText;
};

export type KnowledgePackArticle = {
  id: string;
  key: string;
  category: "KNOWLEDGE" | "INFO_PAGE" | "LEGAL";
  icon: string | null;
  sortOrder: number;
  title: LocalizedText;
  bodyHtml: LocalizedText;
  bodyText: LocalizedText;
};

export type KnowledgePack = {
  version: number;
  languages: AppLanguage[];
  faqs: KnowledgePackFaq[];
  knowledge: KnowledgePackArticle[];
  pages: KnowledgePackArticle[];
};

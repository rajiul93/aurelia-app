import type { AppLanguage } from "@/store/locale-store";
import type { SearchDocument } from "@/types/tour-bundle";

/**
 * How much of each retrieved passage reaches the prompt.
 *
 * The context window is 2048 tokens and three passages plus the system prompt
 * and the answer all have to fit. Knowledge-base bodies can run to thousands of
 * characters, so an untrimmed passage would silently push the others — and
 * sometimes the question itself — out of the window.
 */
const MAX_PASSAGE_CHARS = 700;

/** Beyond three, a 1B model starts averaging the passages instead of using them. */
export const MAX_CONTEXT_PASSAGES = 3;

const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
};

function trimPassage(text: string) {
  const clean = text.replace(/\s+/gu, " ").trim();

  if (clean.length <= MAX_PASSAGE_CHARS) {
    return clean;
  }

  return `${clean.slice(0, MAX_PASSAGE_CHARS).trimEnd()}…`;
}

/**
 * The grounding contract.
 *
 * Every clause here exists because a 1B model will otherwise fill gaps from its
 * pretraining — and for a paid heritage tour, a confidently invented date is
 * worse than "I don't know". The passages are the *only* permitted source, and
 * the refusal sentence gives the model an acceptable way out so it does not
 * reach for one of its own.
 */
export function buildSystemPrompt(language: AppLanguage) {
  const languageName = LANGUAGE_NAMES[language];

  return [
    "You are Aurelia, a friendly walking-tour guide.",
    `Answer only in ${languageName}, regardless of the language of the source material.`,
    "Use ONLY the numbered passages the user provides. They are your single source of truth.",
    "If the passages do not contain the answer, say you do not have that information — never guess, and never use knowledge from outside the passages.",
    "Write two or three short sentences in a warm, conversational tone. Do not mention the passages, their numbers, or that you were given context.",
  ].join(" ");
}

export function buildUserPrompt(question: string, passages: SearchDocument[]) {
  const context = passages
    .slice(0, MAX_CONTEXT_PASSAGES)
    .map((passage, index) => {
      const title = passage.title.trim();
      const body = trimPassage(passage.body);

      return `Passage ${index + 1}${title ? ` — ${title}` : ""}:\n${body}`;
    })
    .join("\n\n");

  return `${context}\n\nQuestion: ${question.trim()}`;
}

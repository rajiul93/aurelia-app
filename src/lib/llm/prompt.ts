import type { AppLanguage } from "@/store/locale-store";
import type { SearchDocument } from "@/types/tour-bundle";

export type AiProvider = "gemma" | "gemini";

/**
 * Gemma 3 1B: context window is 2048 tokens and three passages plus the system prompt
 * and the answer all have to fit. Knowledge-base bodies can run to thousands of
 * characters, so an untrimmed passage would silently push the others — and
 * sometimes the question itself — out of the window.
 */
const GEMMA_MAX_PASSAGE_CHARS = 700;

/** Beyond three, a 1B model starts averaging the passages instead of using them. */
const GEMMA_MAX_CONTEXT_PASSAGES = 3;

/**
 * Gemini 2.5-flash: ~1M token context window, no averaging pathology.
 * Relax the constraints to let the model provide more complete replies.
 */
const GEMINI_MAX_PASSAGE_CHARS = 2000;
const GEMINI_MAX_CONTEXT_PASSAGES = 5;

/**
 * Legacy export for tests that check the gemma case by default.
 * New code should pass the provider explicitly.
 */
export const MAX_CONTEXT_PASSAGES = GEMMA_MAX_CONTEXT_PASSAGES;

const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
};

function trimPassageWithLimit(text: string, maxChars: number) {
  const clean = text.replace(/\s+/gu, " ").trim();

  if (clean.length <= maxChars) {
    return clean;
  }

  return `${clean.slice(0, maxChars).trimEnd()}…`;
}

/**
 * The grounding contract.
 *
 * Every clause here exists because a model will otherwise fill gaps from its
 * pretraining — and for a paid heritage tour, a confidently invented date is
 * worse than "I don't know". The passages are the *only* permitted source, and
 * the refusal sentence gives the model an acceptable way out so it does not
 * reach for one of its own. This contract is identical for both providers.
 */
export function buildSystemPrompt(
  language: AppLanguage,
  provider: AiProvider = "gemma",
) {
  const languageName = LANGUAGE_NAMES[language];

  const baseClauses = [
    "You are Aurelia, a friendly walking-tour guide.",
    `Answer only in ${languageName}, regardless of the language of the source material.`,
    "Use ONLY the numbered passages the user provides. They are your single source of truth.",
    "If the passages do not contain the answer, say you do not have that information — never guess, and never use knowledge from outside the passages.",
  ];

  const lengthInstruction =
    provider === "gemini"
      ? "Write a natural, conversational reply — use as many sentences as needed to answer well, but stay concise and avoid padding. Do not mention the passages, their numbers, or that you were given context."
      : "Write two or three short sentences in a warm, conversational tone. Do not mention the passages, their numbers, or that you were given context.";

  return [...baseClauses, lengthInstruction].join(" ");
}

export function buildUserPrompt(
  question: string,
  passages: SearchDocument[],
  provider: AiProvider = "gemma",
) {
  const maxPassageChars =
    provider === "gemini" ? GEMINI_MAX_PASSAGE_CHARS : GEMMA_MAX_PASSAGE_CHARS;
  const maxContextPassages =
    provider === "gemini"
      ? GEMINI_MAX_CONTEXT_PASSAGES
      : GEMMA_MAX_CONTEXT_PASSAGES;

  const context = passages
    .slice(0, maxContextPassages)
    .map((passage, index) => {
      const title = passage.title.trim();
      const body = trimPassageWithLimit(passage.body, maxPassageChars);

      return `Passage ${index + 1}${title ? ` — ${title}` : ""}:\n${body}`;
    })
    .join("\n\n");

  return `${context}\n\nQuestion: ${question.trim()}`;
}

import type { AppLanguage } from "@/store/locale-store";

/**
 * One question the on-device assistant had zero source passages for, waiting
 * to reach the server. Queued rather than sent immediately so a visitor
 * without signal inside the venue doesn't silently lose the question — see
 * `queue.ts`.
 */
export type QueuedUnansweredQuestion = {
  id: string;
  question: string;
  language: AppLanguage;
  /** "" for a question asked outside any tour context (matches the server's sentinel). */
  tourId: string;
  /** ISO timestamp of when it was actually asked on-device, not when it syncs. */
  askedAt: string;
};

export type UnansweredQuestionQueueSnapshot = {
  items: QueuedUnansweredQuestion[];
};

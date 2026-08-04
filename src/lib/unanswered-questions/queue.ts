import { unansweredQuestionsService } from "@/services/unanswered-questions.service";
import type { AppLanguage } from "@/store/locale-store";
import { loadQueueSnapshot, saveQueueSnapshot } from "./storage";
import type { QueuedUnansweredQuestion } from "./types";

/**
 * Persisted, best-effort-synced queue for questions the assistant could not
 * answer. A visitor is often offline inside the venue itself, so the question
 * is written to disk immediately and only removed once the server has
 * confirmed it — never sent-and-forgotten in memory.
 */

// Bounded so a device that stays offline for a long stretch can't grow this
// file without limit; losing the oldest few beats losing the whole queue to a
// file so large a read/parse starts failing.
const MAX_QUEUE_SIZE = 200;

// Matches the server's per-request cap (`reportUnansweredQuestionsSchema`).
const BATCH_SIZE = 20;

let cache: QueuedUnansweredQuestion[] | null = null;
let loadPromise: Promise<QueuedUnansweredQuestion[]> | null = null;
let flushPromise: Promise<void> | null = null;

function ensureLoaded(): Promise<QueuedUnansweredQuestion[]> {
  if (cache) {
    return Promise.resolve(cache);
  }

  if (!loadPromise) {
    loadPromise = loadQueueSnapshot().then((snapshot) => {
      cache = snapshot?.items ?? [];
      return cache;
    });
  }

  return loadPromise;
}

function persist(items: QueuedUnansweredQuestion[]) {
  saveQueueSnapshot({ items });
}

function makeId() {
  return `uq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueueUnansweredQuestion(params: {
  question: string;
  language: AppLanguage;
  tourId: string;
}) {
  const question = params.question.trim();
  if (!question) {
    return;
  }

  const items = await ensureLoaded();

  items.push({
    id: makeId(),
    question,
    language: params.language,
    tourId: params.tourId,
    askedAt: new Date().toISOString(),
  });

  while (items.length > MAX_QUEUE_SIZE) {
    items.shift();
  }

  persist(items);

  // Best-effort immediate attempt: most visitors do have some connectivity,
  // offline is the edge case, so this usually clears the item right away and
  // the next foreground sync has nothing to do. A failure just leaves it
  // queued for `flushUnansweredQuestionQueue` to retry later.
  void flushUnansweredQuestionQueue();
}

/**
 * Drain the queue, one batch at a time. Stops at the first failure (offline,
 * or a transient server error) and leaves everything from that point on —
 * including the failed batch — on disk for the next attempt. Safe to call
 * concurrently; overlapping calls share one in-flight run.
 */
export function flushUnansweredQuestionQueue(): Promise<void> {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    const items = await ensureLoaded();

    while (items.length > 0) {
      const batch = items.slice(0, BATCH_SIZE);

      try {
        await unansweredQuestionsService.report(batch);
      } catch {
        return;
      }

      items.splice(0, batch.length);
      persist(items);
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

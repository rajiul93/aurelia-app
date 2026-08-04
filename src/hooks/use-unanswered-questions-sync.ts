import { useEffect } from "react";
import { AppState } from "react-native";

import { flushUnansweredQuestionQueue } from "@/lib/unanswered-questions/queue";

/**
 * Retries the persisted unanswered-question queue whenever the app comes to
 * the foreground, plus once at mount (cold start). No network-reachability
 * check — this app has no NetInfo dependency anywhere else either, so this
 * mirrors `useReleaseConfigSync`'s own approach: attempt on foreground, let a
 * failed request (offline or transient) just leave the queue for next time.
 */
export function useUnansweredQuestionsSync() {
  useEffect(() => {
    void flushUnansweredQuestionQueue();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void flushUnansweredQuestionQueue();
      }
    });

    return () => subscription.remove();
  }, []);
}

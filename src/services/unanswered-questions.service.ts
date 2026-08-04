import { apiClient } from "@/lib/axios/client";
import type { QueuedUnansweredQuestion } from "@/lib/unanswered-questions/types";
import type { ApiSuccess } from "@/types/api";

export const unansweredQuestionsService = {
  /** Batch-report a flush of the local queue. Server caps a batch at 20 items. */
  report(items: QueuedUnansweredQuestion[]) {
    const payload = {
      items: items.map((item) => ({
        question: item.question,
        language: item.language,
        tourId: item.tourId,
        askedAt: item.askedAt,
      })),
    };

    return apiClient
      .post<ApiSuccess<{ recorded: number }>>("/unanswered-questions", payload)
      .then((response) => response.data);
  },
};

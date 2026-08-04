import { useUnansweredQuestionsSync } from "@/hooks/use-unanswered-questions-sync";

export function UnansweredQuestionsSyncListener() {
  useUnansweredQuestionsSync();
  return null;
}

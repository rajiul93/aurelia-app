import { retrievePassages } from "@/lib/knowledge/assistant";
import { getDeviceCapability } from "@/lib/llm/device-capability";
import {
  getLlamaContext,
  isLlamaNativeAvailable,
  streamCompletion,
} from "@/lib/llm/llama-runtime";
import { getInstalledModelPath } from "@/lib/llm/model-manager";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/llm/prompt";
import type { AppLanguage } from "@/store/locale-store";
import type { KnowledgePack } from "@/types/knowledge";
import type { SearchDocument } from "@/types/tour-bundle";

export type GenerateRequest = {
  question: string;
  language: AppLanguage;
  pack: KnowledgePack | null;
  tourDocuments: SearchDocument[];
  preferredTourId?: string | null;
  enabled: boolean;
  onToken: (text: string) => void;
};

export type GenerationHandle = {
  /** Full answer text, or null when generation was stopped or failed. */
  completion: Promise<string | null>;
  stop: () => void;
  sourceTourId: string | null;
};

/**
 * Why generation was not attempted. Surfaced for diagnostics only — every one
 * of these is a silent fall back to the retrieval assistant, never an error the
 * user sees.
 */
export type GenerationSkipReason =
  | "disabled"
  | "device_incapable"
  | "runtime_missing"
  | "model_missing"
  | "no_passages"
  | "context_failed";

export type GenerateResult =
  | { started: true; handle: GenerationHandle }
  | { started: false; reason: GenerationSkipReason };

/**
 * Try to answer generatively, grounded in the retrieved passages.
 *
 * Every precondition is checked before a single token is generated, and each
 * failure returns `started: false` rather than throwing, so the caller has one
 * branch: if it did not start, run the retrieval assistant instead.
 */
export async function generateAnswer(
  request: GenerateRequest,
): Promise<GenerateResult> {
  if (!request.enabled) {
    return { started: false, reason: "disabled" };
  }

  if (!getDeviceCapability().canRunModel) {
    return { started: false, reason: "device_incapable" };
  }

  if (!isLlamaNativeAvailable()) {
    return { started: false, reason: "runtime_missing" };
  }

  const modelPath = getInstalledModelPath();
  if (!modelPath) {
    return { started: false, reason: "model_missing" };
  }

  const passages = retrievePassages(
    request.question,
    request.language,
    request.pack,
    request.tourDocuments,
    request.preferredTourId,
  );

  // The hallucination guard, and the reason it sits *before* the context load:
  // with nothing retrieved the model has no source of truth and a 1B model will
  // happily invent one. No passages means no generation, full stop.
  if (passages.length === 0) {
    return { started: false, reason: "no_passages" };
  }

  const context = await getLlamaContext(modelPath);
  if (!context) {
    return { started: false, reason: "context_failed" };
  }

  const handle = streamCompletion(
    context,
    buildSystemPrompt(request.language),
    buildUserPrompt(request.question, passages),
    request.onToken,
  );

  return {
    started: true,
    handle: {
      completion: handle.completion,
      stop: handle.stop,
      sourceTourId: passages[0]?.tourId || null,
    },
  };
}

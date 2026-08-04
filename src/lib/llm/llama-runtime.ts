import { AppState, TurboModuleRegistry, type AppStateStatus } from "react-native";

import type { LlamaContext } from "llama.rn";

/**
 * Context window. Must hold the system prompt, the retrieved passages, the
 * question and the answer — but KV-cache memory scales with it, and this runs
 * alongside MapLibre and an active GPS session. 2048 fits three trimmed
 * passages comfortably; raising it buys nothing but memory pressure.
 */
const CONTEXT_SIZE = 2048;

/** Answers are a short paragraph, not an essay. Also bounds worst-case latency. */
const MAX_ANSWER_TOKENS = 220;

export function isLlamaNativeAvailable(): boolean {
  return TurboModuleRegistry.get("RNLlama") != null;
}

type LoadedContext = {
  context: LlamaContext;
  modelPath: string;
};

let loaded: LoadedContext | null = null;
let loading: Promise<LoadedContext | null> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

/**
 * `llama.rn` pulls in a TurboModule at import time, which throws in any build
 * without the native side (Expo Go, the Vitest node environment). Required
 * lazily so merely importing this module — which the chat screen does on every
 * launch — cannot crash those environments.
 */
async function loadLlamaModule() {
  return (await import("llama.rn")) as typeof import("llama.rn");
}

function handleAppStateChange(status: AppStateStatus) {
  // Only "background". "inactive" fires for the notification shade and the app
  // switcher, and tearing down a ~1 GB context every time the user glances at a
  // notification would make the next question pay a multi-second reload.
  if (status === "background") {
    void releaseLlamaContext();
  }
}

function watchAppState() {
  appStateSubscription ??= AppState.addEventListener(
    "change",
    handleAppStateChange,
  );
}

/**
 * Load the model, or return the already-loaded context.
 *
 * Held open between questions on purpose: `initLlama` reads ~0.5 GB off disk
 * and takes seconds, so doing it per question would dominate the response time.
 * Returns null — never throws — when the runtime or model cannot be used, so
 * every caller has exactly one fallback branch to write.
 */
export async function getLlamaContext(
  modelPath: string,
): Promise<LlamaContext | null> {
  if (loaded && loaded.modelPath === modelPath) {
    return loaded.context;
  }

  // The model path changed (remote config pointed at a new build), so the old
  // context is stale and must go before another ~1 GB is allocated.
  if (loaded) {
    await releaseLlamaContext();
  }

  loading ??= (async () => {
    if (!isLlamaNativeAvailable()) {
      return null;
    }

    try {
      const { initLlama } = await loadLlamaModule();
      const context = await initLlama({
        model: modelPath,
        n_ctx: CONTEXT_SIZE,
        // iOS offloads to Metal; on Android the plugin's OpenCL/Hexagon path
        // decides for itself and ignores this.
        n_gpu_layers: 99,
        use_progress_callback: false,
      });

      watchAppState();
      return { context, modelPath };
    } catch {
      // A corrupt GGUF, an unsupported quantization or an OOM all land here.
      // The assistant falls back to retrieval rather than surfacing an error.
      return null;
    }
  })();

  try {
    loaded = await loading;
    return loaded?.context ?? null;
  } finally {
    loading = null;
  }
}

export async function releaseLlamaContext() {
  const current = loaded;
  loaded = null;

  if (!current) {
    return;
  }

  try {
    await current.context.release();
  } catch {
    // Releasing a context that native code already tore down is not an error
    // worth propagating — the JS handle is dropped either way.
  }
}

export type StreamHandle = {
  /** Resolves with the full answer text, or null if it was stopped or failed. */
  completion: Promise<string | null>;
  stop: () => void;
};

/**
 * Stream one answer.
 *
 * `clearCache` runs first because llama.rn reuses the KV cache across calls:
 * without it the previous question's context bleeds into this one, which for a
 * 1B model reliably produces answers about the wrong tour.
 */
export function streamCompletion(
  context: LlamaContext,
  systemPrompt: string,
  userPrompt: string,
  onToken: (text: string) => void,
): StreamHandle {
  let stopped = false;

  const completion = (async () => {
    try {
      await context.clearCache();

      const result = await context.completion(
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          n_predict: MAX_ANSWER_TOKENS,
          // Low but not zero: the job is to rephrase retrieved facts readably,
          // not to invent. Higher values make a 1B model drift off the passages.
          temperature: 0.3,
          top_p: 0.9,
          stop: ["<end_of_turn>", "<eos>"],
        },
        (data) => {
          if (stopped) {
            return;
          }

          if (data.token) {
            onToken(data.token);
          }
        },
      );

      return stopped ? null : (result.text ?? "").trim();
    } catch {
      return null;
    }
  })();

  return {
    completion,
    stop: () => {
      stopped = true;
      void context.stopCompletion().catch(() => {
        // Already finished — nothing to stop.
      });
    },
  };
}

/** Test seam. */
export function resetLlamaRuntimeForTests() {
  loaded = null;
  loading = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
}

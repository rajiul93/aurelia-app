import { env } from "@/lib/env";

const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

export function isGeminiAvailable(): boolean {
  return Boolean(env.geminiApiKey);
}

interface GeminiCompletionParams {
  systemPrompt: string;
  userPrompt: string;
  onToken: (token: string) => void;
}

interface CompletionResult {
  completion: Promise<string | null>;
  stop: () => void;
}

/**
 * Stream completion from Gemini API. Non-streaming (REST, not Server-Sent Events) because
 * React Native's fetch doesn't support ReadableStream consumption. Full reply arrives in
 * one response and is passed to onToken as a single chunk — the UI effect is the same as
 * `retrievalAnswer()` would produce (one bubble), just with generated text instead of quoted.
 *
 * **Network failure, non-2xx, timeout, or mid-parsing errors** resolve `completion` to `null`,
 * which signals the caller to fall back to `retrievalAnswer()` — the exact contract as
 * `streamLlamaCompletion` so both providers fit the same shape.
 */
export function streamGeminiCompletion(
  params: GeminiCompletionParams,
): CompletionResult {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  const completion = (async () => {
    try {
      const response = await fetch(GEMINI_API_ENDPOINT, {
        method: "POST",
        headers: {
          "x-goog-api-key": env.geminiApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: params.systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: params.userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (__DEV__) {
          console.warn(
            `[gemini] API returned ${response.status}: ${response.statusText}`,
          );
        }
        return null;
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
      };

      if (data.error) {
        if (__DEV__) {
          console.warn(`[gemini] API error: ${data.error.message}`);
        }
        return null;
      }

      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

      if (!text) {
        if (__DEV__) {
          console.warn("[gemini] No text in response");
        }
        return null;
      }

      // Single chunk to onToken (non-streaming REST response).
      params.onToken(text);
      return text;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Stopped by caller or timeout — expected, return null to fall back.
        return null;
      }

      if (__DEV__) {
        console.warn(`[gemini] Request failed: ${String(error)}`);
      }

      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  return {
    completion,
    stop: () => controller.abort(),
  };
}

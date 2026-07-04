/** AI provider/model ids and context-window metadata shared by server and client code. */

export const AI_PROVIDER_GEMINI = "gemini";

export type AiProviderId = typeof AI_PROVIDER_GEMINI;

export const DEFAULT_AI_PROVIDER_ID = AI_PROVIDER_GEMINI;

export const GEMINI_FLASH_LATEST_MODEL_ID = "gemini-flash-latest";

/**
 * `gemini-flash-latest` is treated as a Flash-family model with a 1M token
 * context window. If `GEMINI_MODEL_ID` is changed to a known model id, the API
 * response will return that model's configured limit instead.
 */
export const GEMINI_FLASH_LATEST_CONTEXT_TOKENS = 1_048_576;

const GEMINI_CONTEXT_TOKENS_BY_MODEL_ID: Record<string, number> = {
  [GEMINI_FLASH_LATEST_MODEL_ID]: GEMINI_FLASH_LATEST_CONTEXT_TOKENS,
  "gemini-2.5-flash": 1_048_576,
  "gemini-2.5-flash-latest": 1_048_576,
  "gemini-2.0-flash": 1_048_576,
  "gemini-2.0-flash-latest": 1_048_576,
};

export type GeminiModelConfig = {
  provider: AiProviderId;
  id: string;
  maxContextTokens: number;
};

export type AiModelConfig = GeminiModelConfig;

export function parseAiProviderId(
  value: string | null | undefined,
): AiProviderId | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return DEFAULT_AI_PROVIDER_ID;
  return normalized === AI_PROVIDER_GEMINI ? AI_PROVIDER_GEMINI : null;
}

export function getGeminiContextTokens(modelId: string): number {
  return (
    GEMINI_CONTEXT_TOKENS_BY_MODEL_ID[modelId] ??
    GEMINI_FLASH_LATEST_CONTEXT_TOKENS
  );
}

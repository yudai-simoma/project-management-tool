/** Gemini model ids and context-window metadata shared by server and client code. */

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
  id: string;
  maxContextTokens: number;
};

export function getGeminiContextTokens(modelId: string): number {
  return (
    GEMINI_CONTEXT_TOKENS_BY_MODEL_ID[modelId] ??
    GEMINI_FLASH_LATEST_CONTEXT_TOKENS
  );
}

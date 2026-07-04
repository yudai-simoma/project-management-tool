/** AI provider/model ids and context-window metadata shared by server and client code. */

export const AI_PROVIDER_GEMINI = "gemini";

export type AiProviderId = typeof AI_PROVIDER_GEMINI;

export const DEFAULT_AI_PROVIDER_ID = AI_PROVIDER_GEMINI;

export const GEMINI_2_5_FLASH_MODEL_ID = "gemini-2.5-flash";
export const GEMINI_2_5_FLASH_LITE_MODEL_ID = "gemini-2.5-flash-lite";
export const GEMINI_FLASH_LATEST_MODEL_ID = "gemini-flash-latest";
export const DEFAULT_GEMINI_MODEL_ID = GEMINI_2_5_FLASH_MODEL_ID;
export const GEMINI_MODEL_IDS = [
  GEMINI_2_5_FLASH_MODEL_ID,
  GEMINI_2_5_FLASH_LITE_MODEL_ID,
  GEMINI_FLASH_LATEST_MODEL_ID,
] as const;

/**
 * Flash-family models are treated as 1M-token context-window models for
 * display. The actual provider limit is enforced by the Gemini API.
 */
export const GEMINI_FLASH_LATEST_CONTEXT_TOKENS = 1_048_576;

export const GEMINI_MODEL_OPTIONS = [
  {
    id: GEMINI_2_5_FLASH_MODEL_ID,
    label: "Gemini 2.5 Flash",
    description: "推奨。速度・品質・無料枠のバランスがよい標準モデル。",
  },
  {
    id: GEMINI_2_5_FLASH_LITE_MODEL_ID,
    label: "Gemini 2.5 Flash-Lite",
    description: "軽量。短い壁打ちや提出用デモで呼び出し量を抑えたい時向け。",
  },
  {
    id: GEMINI_FLASH_LATEST_MODEL_ID,
    label: "Gemini Flash Latest",
    description:
      "Flash系の最新エイリアス。切り替わる可能性があるため検証向け。",
  },
] as const;

export type GeminiModelId = (typeof GEMINI_MODEL_IDS)[number];

const GEMINI_CONTEXT_TOKENS_BY_MODEL_ID: Record<string, number> = {
  [GEMINI_2_5_FLASH_MODEL_ID]: 1_048_576,
  [GEMINI_2_5_FLASH_LITE_MODEL_ID]: 1_048_576,
  [GEMINI_FLASH_LATEST_MODEL_ID]: GEMINI_FLASH_LATEST_CONTEXT_TOKENS,
  "gemini-2.5-flash-latest": 1_048_576,
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

export function isGeminiModelId(value: string): value is GeminiModelId {
  return GEMINI_MODEL_OPTIONS.some((option) => option.id === value);
}

export function resolveGeminiModelId(
  value: string | null | undefined,
): GeminiModelId | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return isGeminiModelId(normalized) ? normalized : null;
}

export function getConfiguredGeminiModelId(): GeminiModelId {
  return (
    resolveGeminiModelId(process.env.AI_MODEL_ID) ??
    resolveGeminiModelId(process.env.GEMINI_MODEL_ID) ??
    DEFAULT_GEMINI_MODEL_ID
  );
}

export function getGeminiContextTokens(modelId: string): number {
  return (
    GEMINI_CONTEXT_TOKENS_BY_MODEL_ID[modelId] ??
    GEMINI_FLASH_LATEST_CONTEXT_TOKENS
  );
}

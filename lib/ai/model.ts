/**
 * Vercel AI SDK model factory.
 *
 * AI API の差し替えをこのファイルに集約する。現時点で実装済みの provider は
 * Gemini のみだが、将来 OpenAI 等を足す場合は provider id・APIキー保存キー・
 * `createAiModel` の switch に追加すれば、Route Handler 側は触らずに済む。
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

import {
  AI_PROVIDER_GEMINI,
  GEMINI_FLASH_LATEST_MODEL_ID,
  getGeminiContextTokens,
  parseAiProviderId,
  type AiModelConfig,
} from "@/lib/ai/model-config";

const AI_MODEL_ID_ENV = "AI_MODEL_ID";
const GEMINI_MODEL_ID_ENV = "GEMINI_MODEL_ID";

export function getAiModelConfig(): AiModelConfig {
  const provider = parseAiProviderId(process.env.AI_PROVIDER);
  if (!provider) {
    throw new Error(
      `Unsupported AI_PROVIDER: ${process.env.AI_PROVIDER}. Supported providers: ${AI_PROVIDER_GEMINI}`,
    );
  }

  switch (provider) {
    case AI_PROVIDER_GEMINI: {
      const modelId =
        process.env[AI_MODEL_ID_ENV]?.trim() ||
        process.env[GEMINI_MODEL_ID_ENV]?.trim() ||
        GEMINI_FLASH_LATEST_MODEL_ID;

      return {
        provider,
        id: modelId,
        maxContextTokens: getGeminiContextTokens(modelId),
      };
    }
  }
}

export function createAiModel(apiKey: string): LanguageModel {
  const config = getAiModelConfig();

  switch (config.provider) {
    case AI_PROVIDER_GEMINI: {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(config.id);
    }
  }
}

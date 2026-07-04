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
  getGeminiContextTokens,
  getConfiguredGeminiModelId,
  parseAiProviderId,
  resolveGeminiModelId,
  type AiModelConfig,
} from "@/lib/ai/model-config";

export function getAiModelConfig(modelId?: string | null): AiModelConfig {
  const provider = parseAiProviderId(process.env.AI_PROVIDER);
  if (!provider) {
    throw new Error(
      `Unsupported AI_PROVIDER: ${process.env.AI_PROVIDER}. Supported providers: ${AI_PROVIDER_GEMINI}`,
    );
  }

  switch (provider) {
    case AI_PROVIDER_GEMINI: {
      const resolvedModelId =
        resolveGeminiModelId(modelId) ?? getConfiguredGeminiModelId();

      return {
        provider,
        id: resolvedModelId,
        maxContextTokens: getGeminiContextTokens(resolvedModelId),
      };
    }
  }
}

export function createAiModel(
  apiKey: string,
  config = getAiModelConfig(),
): LanguageModel {
  switch (config.provider) {
    case AI_PROVIDER_GEMINI: {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(config.id);
    }
  }
}

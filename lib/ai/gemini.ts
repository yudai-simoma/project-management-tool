/**
 * Vercel AI SDK 経由の Gemini モデル生成。
 *
 * BYOK 方針のため、サーバー全体で共有する `GOOGLE_GENERATIVE_AI_API_KEY` は使わず、
 * 呼び出しごとにユーザー個人のAPIキー（`lib/ai/api-key.ts`）を渡してプロバイダを作る。
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

import {
  GEMINI_FLASH_LATEST_MODEL_ID,
  getGeminiContextTokens,
  type GeminiModelConfig,
} from "@/lib/ai/model-config";

/** 無料枠での利用を想定した既定モデル。`.env.local` の `GEMINI_MODEL_ID` で上書きできる。 */
const DEFAULT_MODEL_ID = GEMINI_FLASH_LATEST_MODEL_ID;

export function getGeminiModelConfig(): GeminiModelConfig {
  const modelId = process.env.GEMINI_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  return {
    id: modelId,
    maxContextTokens: getGeminiContextTokens(modelId),
  };
}

export function createGeminiModel(apiKey: string): LanguageModel {
  const google = createGoogleGenerativeAI({ apiKey });
  return google(getGeminiModelConfig().id);
}

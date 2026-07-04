/**
 * Backward-compatible Gemini exports.
 *
 * 新規コードは `lib/ai/model.ts` の `createAiModel` / `getAiModelConfig` を使う。
 * 既存テストや古い参照が壊れないよう、Gemini 名の export だけ残している。
 */

export {
  createAiModel as createGeminiModel,
  getAiModelConfig as getGeminiModelConfig,
} from "@/lib/ai/model";

/**
 * AI APIキー（BYOK）の保存先。Clerkユーザーの private metadata に保存する
 * （サーバーサイドのみアクセス可、`docs/mock-implementation-plan.md` §2.5 決定）。
 *
 * `clerkClient()` はサーバー専用（`@clerk/nextjs/server`）のため、Route Handler
 * からのみ呼び出す想定（`lib/clerk/org-members.ts` と同じ制約）。
 */

import { clerkClient } from "@clerk/nextjs/server";

import {
  AI_PROVIDER_GEMINI,
  getConfiguredGeminiModelId,
  resolveGeminiModelId,
  type AiProviderId,
  type GeminiModelId,
} from "@/lib/ai/model-config";

const METADATA_KEY_BY_PROVIDER: Record<AiProviderId, string> = {
  [AI_PROVIDER_GEMINI]: "geminiApiKey",
};

const MODEL_METADATA_KEY_BY_PROVIDER: Record<AiProviderId, string> = {
  [AI_PROVIDER_GEMINI]: "geminiModelId",
};

function getMetadataKey(): string {
  return METADATA_KEY_BY_PROVIDER[AI_PROVIDER_GEMINI];
}

function getModelMetadataKey(): string {
  return MODEL_METADATA_KEY_BY_PROVIDER[AI_PROVIDER_GEMINI];
}

/** 現在の provider 用に保存済みのAPIキーを返す。未設定（空文字含む）なら `null`。 */
export async function getAiApiKey(userId: string): Promise<string | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const value = user.privateMetadata[getMetadataKey()];
  return typeof value === "string" && value.trim() ? value : null;
}

/** 現在の provider 用に保存済みのモデルIDを返す。未設定なら既定モデルを返す。 */
export async function getAiModelId(userId: string): Promise<GeminiModelId> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const value = user.privateMetadata[getModelMetadataKey()];
  return typeof value === "string"
    ? (resolveGeminiModelId(value) ?? getConfiguredGeminiModelId())
    : getConfiguredGeminiModelId();
}

/** APIキーとモデルIDを一度の Clerk 読み取りで取得する。 */
export async function getAiSettings(
  userId: string,
): Promise<{ apiKey: string | null; modelId: GeminiModelId }> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const apiKeyValue = user.privateMetadata[getMetadataKey()];
  const modelValue = user.privateMetadata[getModelMetadataKey()];

  return {
    apiKey:
      typeof apiKeyValue === "string" && apiKeyValue.trim()
        ? apiKeyValue
        : null,
    modelId:
      typeof modelValue === "string"
        ? (resolveGeminiModelId(modelValue) ?? getConfiguredGeminiModelId())
        : getConfiguredGeminiModelId(),
  };
}

/**
 * 現在の provider 用にAPIキーを保存する。空文字を渡すとキーを削除する。
 * `updateUserMetadata` は他の private metadata キーとは deep merge されるため、
 * この呼び出しが provider 別のAPIキー以外の値に影響することはない。
 */
export async function setAiApiKey(
  userId: string,
  apiKey: string,
): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { [getMetadataKey()]: apiKey },
  });
}

/** 現在の provider 用にモデルIDを保存する。 */
export async function setAiModelId(
  userId: string,
  modelId: GeminiModelId,
): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { [getModelMetadataKey()]: modelId },
  });
}

/** APIキーとモデルIDをまとめて保存する。apiKey が未指定ならキーは変更しない。 */
export async function setAiSettings(
  userId: string,
  input: { apiKey?: string; modelId: GeminiModelId },
): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      [getModelMetadataKey()]: input.modelId,
      ...(input.apiKey !== undefined
        ? { [getMetadataKey()]: input.apiKey }
        : {}),
    },
  });
}

export const getGeminiApiKey = getAiApiKey;
export const setGeminiApiKey = setAiApiKey;

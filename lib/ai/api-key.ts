/**
 * AI APIキー（BYOK）の保存先。Clerkユーザーの private metadata に保存する
 * （サーバーサイドのみアクセス可、`docs/mock-implementation-plan.md` §2.5 決定）。
 *
 * `clerkClient()` はサーバー専用（`@clerk/nextjs/server`）のため、Route Handler
 * からのみ呼び出す想定（`lib/clerk/org-members.ts` と同じ制約）。
 */

import { clerkClient } from "@clerk/nextjs/server";

import { getAiModelConfig } from "@/lib/ai/model";
import { AI_PROVIDER_GEMINI, type AiProviderId } from "@/lib/ai/model-config";

const METADATA_KEY_BY_PROVIDER: Record<AiProviderId, string> = {
  [AI_PROVIDER_GEMINI]: "geminiApiKey",
};

function getMetadataKey(): string {
  return METADATA_KEY_BY_PROVIDER[getAiModelConfig().provider];
}

/** 現在の provider 用に保存済みのAPIキーを返す。未設定（空文字含む）なら `null`。 */
export async function getAiApiKey(userId: string): Promise<string | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const value = user.privateMetadata[getMetadataKey()];
  return typeof value === "string" && value.trim() ? value : null;
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

export const getGeminiApiKey = getAiApiKey;
export const setGeminiApiKey = setAiApiKey;

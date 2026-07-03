/**
 * Gemini APIキー（BYOK）の保存先。Clerkユーザーの private metadata に保存する
 * （サーバーサイドのみアクセス可、`docs/mock-implementation-plan.md` §2.5 決定）。
 *
 * `clerkClient()` はサーバー専用（`@clerk/nextjs/server`）のため、Route Handler
 * からのみ呼び出す想定（`lib/clerk/org-members.ts` と同じ制約）。
 */

import { clerkClient } from "@clerk/nextjs/server";

const METADATA_KEY = "geminiApiKey";

/** 保存済みのAPIキーを返す。未設定（空文字含む）なら `null`。 */
export async function getGeminiApiKey(userId: string): Promise<string | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const value = user.privateMetadata[METADATA_KEY];
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * APIキーを保存する。空文字を渡すとキーを削除する（`updateUserMetadata` は
 * 他の private metadata キーとは deep merge されるため、この呼び出しが
 * `geminiApiKey` 以外の値に影響することはない）。
 */
export async function setGeminiApiKey(
  userId: string,
  apiKey: string,
): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { [METADATA_KEY]: apiKey },
  });
}

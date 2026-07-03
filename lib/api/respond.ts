/**
 * Route Handler 共通のレスポンス組み立てヘルパー。
 * エラーレスポンスの形（`{ error: string }`）を全 API で統一する。
 */

import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function zodErrorResponse(error: ZodError) {
  return NextResponse.json(
    { error: error.issues[0]?.message ?? "リクエストの形式が正しくありません" },
    { status: 400 },
  );
}

export function notFoundResponse(message = "対象が見つかりません") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function forbiddenResponse(message = "この操作を行う権限がありません") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** JSON ボディを読み取る。パースに失敗した場合は `null` を返す（呼び出し側で 400 を返す）。 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Clerk Organizations API（`lib/clerk/org-members.ts`）呼び出しが投げるエラーを
 * `{ error }` 形式のレスポンスに変換する。存在しないユーザーID・重複した招待など、
 * DBリポジトリの `null` 返却では表現できない失敗（Clerk側のバリデーション）が
 * 実際に発生しうるため、専用のハンドリングを用意する。Clerk由来のエラーでなければ
 * 再スローし、Next.js の既定のエラーハンドリングに委ねる。
 */
export function clerkErrorResponse(error: unknown) {
  if (isClerkAPIResponseError(error)) {
    const detail = error.errors[0];
    return NextResponse.json(
      { error: detail?.longMessage ?? detail?.message ?? error.message },
      { status: error.status },
    );
  }
  throw error;
}

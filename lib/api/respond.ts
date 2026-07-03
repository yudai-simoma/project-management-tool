/**
 * Route Handler 共通のレスポンス組み立てヘルパー。
 * エラーレスポンスの形（`{ error: string }`）を全 API で統一する。
 */

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

/** JSON ボディを読み取る。パースに失敗した場合は `null` を返す（呼び出し側で 400 を返す）。 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

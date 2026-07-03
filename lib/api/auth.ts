/**
 * Route Handler（`app/api/**`）用の組織コンテキスト取得ヘルパー。
 *
 * `proxy.ts`（旧 `middleware.ts`）が「未サインイン」「組織未所属」のリクエストを事前に弾いているため、
 * ここに到達する時点で通常は `userId`/`orgId` が揃っているはずだが、念のため
 * Route Handler 側でも直接検証する（多層防御。`proxy.ts`（旧 `middleware.ts`）の matcher 設定漏れ等の
 * 保険）。あわせて、DB クエリを組織単位でスコープするために必要な `orgId` の値自体を
 * ここで取得する。
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export type OrgContext =
  { ok: true; orgId: string } | { ok: false; response: NextResponse };

export async function requireOrgId(): Promise<OrgContext> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "認証が必要です" }, { status: 401 }),
    };
  }

  if (!orgId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "組織に所属していません" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, orgId };
}

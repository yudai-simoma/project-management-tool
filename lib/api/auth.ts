/**
 * Route Handler（`app/api/**`）用の組織コンテキスト取得ヘルパー。
 *
 * `proxy.ts`（旧 `middleware.ts`）が「未サインイン」「組織未所属」のリクエストを事前に弾いているため、
 * ここに到達する時点で通常は `userId`/`orgId` が揃っているはずだが、念のため
 * Route Handler 側でも直接検証する（多層防御。`proxy.ts`（旧 `middleware.ts`）の matcher 設定漏れ等の
 * 保険）。あわせて、DB クエリを組織単位でスコープするために必要な `orgId` の値、および
 * ロールに基づく操作制限（`docs/backend-implementation-plan.md` セクション6）で使う
 * `userId`/`role` もここで取得する。
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { toRole } from "@/lib/auth/roles";
import { forbiddenResponse } from "@/lib/api/respond";
import type { Role } from "@/lib/schema";

export type OrgContext =
  | { ok: true; orgId: string; userId: string; role: Role }
  | { ok: false; response: NextResponse };

export async function requireOrgId(): Promise<OrgContext> {
  const { userId, orgId, orgRole } = await auth();

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

  return { ok: true, orgId, userId, role: toRole(orgRole) };
}

/**
 * 指定したロールのいずれかでなければ 403 を返す。削除系操作・メンバーのロール変更など、
 * ロールに基づく操作制限をかける Route Handler で `requireOrgId()` の代わりに使う。
 */
export async function requireOrgRole(
  allowedRoles: readonly Role[],
): Promise<OrgContext> {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx;

  if (!allowedRoles.includes(ctx.role)) {
    return { ok: false, response: forbiddenResponse() };
  }

  return ctx;
}

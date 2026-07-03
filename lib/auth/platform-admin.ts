/**
 * プラットフォーム管理者（サービス運営者）の判定ロジック
 * （`docs/feedback-implementation-plan.md` ステップ1）。
 *
 * 組織（ワークスペース）内のOwner/Admin/Memberロール（`lib/auth/permissions.ts`）とは
 * 独立した、サービス全体に対する認可レイヤー。環境変数 `PLATFORM_ADMIN_EMAILS`
 * （カンマ区切り）に列挙したメールアドレスと、Clerkの認証済みユーザーのメールアドレスを
 * 突き合わせて判定する。
 */

import { currentUser } from "@clerk/nextjs/server";

function getPlatformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return getPlatformAdminEmails().includes(email.trim().toLowerCase());
}

/**
 * RSC・Route Handler から呼ぶ。`currentUser()` は `proxy.ts`（ミドルウェア）内での
 * 利用は想定していない（`lib/clerk/org-members.ts` と同様に、ミドルウェアからは
 * `clerkClient()` を直接使う）ため、ここでは Server Component / Route Handler
 * 専用のヘルパーとして提供する。
 */
export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress;
  return isPlatformAdminEmail(email);
}

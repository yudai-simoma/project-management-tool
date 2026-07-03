/**
 * プラットフォーム管理者専用ページ（`/admin`）向けの、Clerk上の全ユーザー一覧・
 * 承認状態更新（`docs/feedback-implementation-plan.md` ステップ1）。
 *
 * `lib/clerk/org-members.ts` は特定の組織（`orgId`）にスコープしたメンバー一覧だが、
 * 会員承認はサービス全体（組織所属前のユーザーも含む）に対して行うため、Clerkの
 * ユーザーAPI（組織非依存）を直接使う。Route Handler からのみ呼び出す想定
 * （サーバー専用、`@clerk/nextjs/server` の `clerkClient` はブラウザから呼べない）。
 */

import { clerkClient } from "@clerk/nextjs/server";

import { getApprovalStatus, type ApprovalStatus } from "@/lib/auth/approval";

export type PlatformUserSummary = {
  id: string;
  name: string;
  email: string;
  approvalStatus: ApprovalStatus;
  createdAt: number;
};

function toName(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return fullName || "(名前未設定)";
}

/** Clerk上の全ユーザーを承認状態付きで返す（`/admin` の一覧表示用）。 */
export async function listPlatformUsers(): Promise<PlatformUserSummary[]> {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ limit: 500 });

  return data.map((user) => ({
    id: user.id,
    name: toName(user),
    email:
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "(メールアドレス未設定)",
    approvalStatus: getApprovalStatus(user.publicMetadata),
    createdAt: user.createdAt,
  }));
}

/** ユーザーの承認状態を更新する（承認・却下・利用停止のいずれも本関数で表現する）。 */
export async function setUserApprovalStatus(
  userId: string,
  status: ApprovalStatus,
): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { approvalStatus: status },
  });
}

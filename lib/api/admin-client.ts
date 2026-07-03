/**
 * `/admin`（プラットフォーム管理者専用ページ）から Route Handler を呼ぶための
 * fetch ラッパー。`lib/api/http.ts` の `apiFetch` を共用する
 * （`lib/api/workspace-client.ts`・`lib/api/members-client.ts` と同じパターン）。
 */

import type { ApprovalStatus } from "@/lib/auth/approval";
import type { PlatformUserSummary } from "@/lib/clerk/platform-users";
import { apiFetch } from "@/lib/api/http";

export function fetchPlatformUsers(): Promise<{
  users: PlatformUserSummary[];
}> {
  return apiFetch("/api/admin/users");
}

export function updateApprovalStatusApi(
  userId: string,
  status: Extract<ApprovalStatus, "approved" | "rejected">,
): Promise<{ id: string; status: ApprovalStatus }> {
  return apiFetch(`/api/admin/users/${userId}/approval`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

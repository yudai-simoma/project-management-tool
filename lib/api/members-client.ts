/**
 * メンバー管理ダイアログ（`components/workspace/MemberManagementSection.tsx`）専用の
 * `app/api/members/**` 呼び出しラッパー。`Workspace.tsx` の `members`（タスク担当者選択用、
 * 承諾済みメンバーの `id`/`name`/`role` のみ）とは別の、メールアドレス・招待中一覧を含む
 * データを扱うため、`lib/api/workspace-client.ts` とは別ファイルに分けている。
 */

import { apiFetch } from "@/lib/api/http";
import type { Member, Role } from "@/lib/schema";
import type {
  InvitationSummary,
  MemberWithEmail,
} from "@/lib/clerk/org-members";

export function fetchOrgMembers(): Promise<{
  members: MemberWithEmail[];
  invitations: InvitationSummary[];
}> {
  return apiFetch("/api/members");
}

export function inviteMemberApi(input: {
  email: string;
  role: Role;
}): Promise<InvitationSummary> {
  return apiFetch<InvitationSummary>("/api/members", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMemberRoleApi(
  userId: string,
  role: Role,
): Promise<Member> {
  return apiFetch<Member>(`/api/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeMemberApi(userId: string): Promise<void> {
  return apiFetch<void>(`/api/members/${userId}`, { method: "DELETE" });
}

export function revokeInvitationApi(invitationId: string): Promise<void> {
  return apiFetch<void>(`/api/members/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

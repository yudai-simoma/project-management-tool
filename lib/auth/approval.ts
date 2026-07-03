/**
 * 会員承認制（`docs/feedback-implementation-plan.md` ステップ1）の承認状態。
 *
 * Clerkユーザーの `publicMetadata.approvalStatus` で管理する。Webhookでの明示的な
 * セット方式ではなく、「未設定 = pending とみなす」ロジックを採用した（新規サインアップ時に
 * 追加のWebhook配線を必要とせず、既存ユーザー・新規ユーザーの両方をこの関数だけで
 * 一貫して扱えるため）。
 */

export type ApprovalStatus = "pending" | "approved" | "rejected";

export function getApprovalStatus(
  publicMetadata: { approvalStatus?: unknown } | null | undefined,
): ApprovalStatus {
  const status = publicMetadata?.approvalStatus;
  return status === "approved" || status === "rejected" ? status : "pending";
}

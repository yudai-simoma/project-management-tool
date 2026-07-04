/**
 * 会員承認制（`docs/feedback-implementation-plan.md` ステップ1）の承認状態。
 *
 * Clerkユーザーの `publicMetadata.approvalStatus` で管理する。Webhookでの明示的な
 * セット方式ではなく、「未設定 = pending とみなす」ロジックを採用した（新規サインアップ時に
 * 追加のWebhook配線を必要とせず、既存ユーザー・新規ユーザーの両方をこの関数だけで
 * 一貫して扱えるため）。
 */

export type ApprovalStatus = "pending" | "approved" | "rejected";

/**
 * 課題提出用のデモ環境などで、プラットフォーム管理者の承認を待たずに
 * ワークスペースを確認できるようにするためのスイッチ。
 *
 * 既定は承認必須。Vercel の Environment Variables で
 * `APPROVAL_REQUIRED=false` を設定した環境だけ承認ゲートを外す。
 */
export function isApprovalRequired(
  value = process.env.APPROVAL_REQUIRED,
): boolean {
  const normalized = value?.trim().toLowerCase();
  return !(
    normalized === "false" ||
    normalized === "0" ||
    normalized === "off" ||
    normalized === "no"
  );
}

export function getApprovalStatus(
  publicMetadata: { approvalStatus?: unknown } | null | undefined,
): ApprovalStatus {
  const status = publicMetadata?.approvalStatus;
  return status === "approved" || status === "rejected" ? status : "pending";
}

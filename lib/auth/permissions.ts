/**
 * ロールに基づく操作制限の判定ロジック（`docs/backend-implementation-plan.md` セクション6）。
 *
 * API Route Handler・UI（Workspace.tsx 等）の両方から参照する。判定ロジックを
 * 二重実装しないため、ここに集約する。
 *
 * 決定事項（着手前にユーザーに確認済み）:
 * - プロジェクト削除・カテゴリ削除・メンバー削除・招待取消・メンバーのロール変更は Owner/Admin のみ
 * - タスク削除は、担当者本人 または Owner/Admin
 * - 組織にOwnerが1人もいなくなる操作（削除・降格）は防ぐ
 */

import type { Role } from "@/lib/schema";

/** 削除・メンバー管理などの操作を許可するロール。 */
export const MANAGE_ROLES: readonly Role[] = ["owner", "admin"];

export function canManageOrg(role: Role): boolean {
  return MANAGE_ROLES.includes(role);
}

/**
 * タスク削除は、担当者本人 または Owner/Admin に許可する。
 * `canManage` は呼び出し側で `canManageOrg(role)` を計算して渡す
 * （UI側は Role を持たずロール由来のブール値だけを持つ場面があるため、
 * ここでは Role ではなくブール値を受け取る）。
 */
export function canDeleteTask(
  canManage: boolean,
  currentUserId: string,
  assigneeId: string,
): boolean {
  return canManage || (assigneeId !== "" && assigneeId === currentUserId);
}

/**
 * `members` の中で `userId` が唯一の Owner かどうか。
 * メンバー削除・ロール変更で「組織にOwnerが1人もいなくなる」操作を防ぐガードで使う。
 */
export function isOnlyOwner<T extends { id: string; role: Role }>(
  members: readonly T[],
  userId: string,
): boolean {
  const owners = members.filter((m) => m.role === "owner");
  return owners.length === 1 && owners[0].id === userId;
}

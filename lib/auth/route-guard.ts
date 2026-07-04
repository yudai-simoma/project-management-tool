/**
 * `proxy.ts`（旧 `middleware.ts`）のルート保護判定ロジック（純粋関数）。
 *
 * Clerk の `clerkMiddleware`/`NextRequest` から切り離した形で持つことで、実際の
 * ミドルウェア実行環境をモックしなくてもユニットテストできるようにしている
 * （`docs/backend-implementation-plan.md` セクション3のテスト方針）。
 *
 * 「組織所属を必須化し、個人ワークスペースは許可しない」という決定
 * （`docs/mock-implementation-plan.md` §2.4, §9.2）に基づく判定に加え、
 * 会員承認制（`docs/feedback-implementation-plan.md` ステップ1）の承認ゲートを持つ:
 *
 * 1. `/sign-in`・`/sign-up` は公開ルート。ただし既にサインイン済み＋組織所属済みなら `/` へ戻す
 * 2. 未サインインは認証を要求する（`requireAuth`。呼び出し側で `auth.protect()` を実行する）
 * 3. `/admin` はプラットフォーム管理者専用。組織所属・承認状態を問わず素通しし、実際の
 *    管理者判定（403/リダイレクト）は `app/admin/layout.tsx` に委ねる（多層防御）
 * 4. プラットフォーム管理者、または承認済み（`approvalStatus === "approved"`）でなければ、
 *    却下済みは `/rejected` へ、それ以外（未承認 = pending）は `/pending-approval` へ
 *    リダイレクトする。**プラットフォーム管理者はこのゲートを常に素通りする**
 *    （締め出し防止のフェイルセーフ）
 *    課題提出用デモでは `approvalRequired: false` を渡すことで、この承認ゲートだけを
 *    無効化できる（サインイン・組織所属チェックは維持する）。
 * 5. 承認済み（またはプラットフォーム管理者）が `/pending-approval`・`/rejected` に
 *    アクセスした場合は、組織所属状況に応じて `/` または `/onboarding` へ戻す
 * 6. サインイン済みだが組織未所属なら `/onboarding` へ、`/onboarding` 自体には
 *    組織所属済みなら `/` へリダイレクトする
 */

import type { ApprovalStatus } from "@/lib/auth/approval";

export type RouteGuardAction =
  | { type: "next" }
  | {
      type: "redirect";
      to: "/" | "/onboarding" | "/pending-approval" | "/rejected";
    }
  | { type: "requireAuth" };

export function decideRouteGuard(params: {
  hasUserId: boolean;
  hasOrgId: boolean;
  isPublicAuthRoute: boolean;
  isOnboardingRoute: boolean;
  /** 既定値 `false`。呼び出し側（`proxy.ts`）で `/admin(.*)` かどうかを渡す。 */
  isAdminRoute?: boolean;
  /** 既定値 `false`。`/pending-approval` かどうか。 */
  isPendingApprovalRoute?: boolean;
  /** 既定値 `false`。`/rejected` かどうか。 */
  isRejectedRoute?: boolean;
  /** 既定値 `false`。サービス運営者（`lib/auth/platform-admin.ts`）かどうか。 */
  isPlatformAdmin?: boolean;
  /** 既定値 `true`。`false` の場合、承認待ち/却下ゲートをスキップする。 */
  approvalRequired?: boolean;
  /** 既定値 `"approved"`（承認ゲートを追加する前の既存呼び出し元との後方互換のため）。 */
  approvalStatus?: ApprovalStatus;
}): RouteGuardAction {
  const {
    hasUserId,
    hasOrgId,
    isPublicAuthRoute,
    isOnboardingRoute,
    isAdminRoute = false,
    isPendingApprovalRoute = false,
    isRejectedRoute = false,
    isPlatformAdmin = false,
    approvalRequired = true,
    approvalStatus = "approved",
  } = params;

  if (isPublicAuthRoute) {
    return hasUserId && hasOrgId
      ? { type: "redirect", to: "/" }
      : { type: "next" };
  }

  if (!hasUserId) {
    return { type: "requireAuth" };
  }

  if (isAdminRoute) {
    return { type: "next" };
  }

  const isApprovalGateExempt =
    !approvalRequired || isPlatformAdmin || approvalStatus === "approved";

  if (!isApprovalGateExempt) {
    if (approvalStatus === "rejected") {
      return isRejectedRoute
        ? { type: "next" }
        : { type: "redirect", to: "/rejected" };
    }
    return isPendingApprovalRoute
      ? { type: "next" }
      : { type: "redirect", to: "/pending-approval" };
  }

  if (isPendingApprovalRoute || isRejectedRoute) {
    return { type: "redirect", to: hasOrgId ? "/" : "/onboarding" };
  }

  if (isOnboardingRoute) {
    return hasOrgId ? { type: "redirect", to: "/" } : { type: "next" };
  }

  return hasOrgId ? { type: "next" } : { type: "redirect", to: "/onboarding" };
}

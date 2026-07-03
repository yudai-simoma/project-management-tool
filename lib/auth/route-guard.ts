/**
 * `proxy.ts`（旧 `middleware.ts`）のルート保護判定ロジック（純粋関数）。
 *
 * Clerk の `clerkMiddleware`/`NextRequest` から切り離した形で持つことで、実際の
 * ミドルウェア実行環境をモックしなくてもユニットテストできるようにしている
 * （`docs/backend-implementation-plan.md` セクション3のテスト方針）。
 *
 * 「組織所属を必須化し、個人ワークスペースは許可しない」という決定
 * （`docs/mock-implementation-plan.md` §2.4, §9.2）に基づく3段階の判定:
 *
 * 1. `/sign-in`・`/sign-up` は公開ルート。ただし既にサインイン済み＋組織所属済みなら `/` へ戻す
 * 2. 未サインインは認証を要求する（`requireAuth`。呼び出し側で `auth.protect()` を実行する）
 * 3. サインイン済みだが組織未所属なら `/onboarding` へ、`/onboarding` 自体には
 *    組織所属済みなら `/` へリダイレクトする
 */

export type RouteGuardAction =
  | { type: "next" }
  | { type: "redirect"; to: "/" | "/onboarding" }
  | { type: "requireAuth" };

export function decideRouteGuard(params: {
  hasUserId: boolean;
  hasOrgId: boolean;
  isPublicAuthRoute: boolean;
  isOnboardingRoute: boolean;
}): RouteGuardAction {
  const { hasUserId, hasOrgId, isPublicAuthRoute, isOnboardingRoute } = params;

  if (isPublicAuthRoute) {
    return hasUserId && hasOrgId
      ? { type: "redirect", to: "/" }
      : { type: "next" };
  }

  if (!hasUserId) {
    return { type: "requireAuth" };
  }

  if (isOnboardingRoute) {
    return hasOrgId ? { type: "redirect", to: "/" } : { type: "next" };
  }

  return hasOrgId ? { type: "next" } : { type: "redirect", to: "/onboarding" };
}

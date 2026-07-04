/**
 * ルート保護（Clerk）。
 *
 * Next.js 16 で `middleware.ts` は `proxy.ts` にリネームされた（挙動・書き方は同じ、
 * ファイル名のみの変更。`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
 * 参照。Next.js 16 では Proxy は既定で Node.js ランタイムになったため、下記の
 * `clerkClient()` 呼び出しも問題なく動作する）。実際の判定ロジック（未サインイン→認証要求、
 * 組織未所属→`/onboarding`、未承認→`/pending-approval` 等）は `lib/auth/route-guard.ts` の
 * `decideRouteGuard`（純粋関数）に切り出している。ここでは Clerk の `auth()`/`NextRequest`
 * から必要な値を取り出し、判定結果に応じた `NextResponse` を組み立てるだけにする。
 */

import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  getApprovalStatus,
  isApprovalRequired,
  type ApprovalStatus,
} from "@/lib/auth/approval";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { decideRouteGuard } from "@/lib/auth/route-guard";

const isPublicAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isPendingApprovalRoute = createRouteMatcher(["/pending-approval(.*)"]);
const isRejectedRoute = createRouteMatcher(["/rejected(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth();

  // 承認状態・プラットフォーム管理者の判定には Clerk ユーザーの publicMetadata・
  // メールアドレスが必要。`auth()` のセッションクレームにはデフォルトで含まれないため、
  // サインイン済みリクエストに限り Backend SDK でユーザー情報を取得する
  // （`currentUser()` はミドルウェア内での利用を想定していないため、
  // `lib/clerk/org-members.ts` と同じ `clerkClient()` 直呼び出しに揃える）。
  let approvalStatus: ApprovalStatus = "pending";
  let isPlatformAdmin = false;

  if (userId) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    approvalStatus = getApprovalStatus(user.publicMetadata);
    isPlatformAdmin = isPlatformAdminEmail(
      user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses[0]?.emailAddress,
    );
  }

  const decision = decideRouteGuard({
    hasUserId: Boolean(userId),
    hasOrgId: Boolean(orgId),
    isPublicAuthRoute: isPublicAuthRoute(req),
    isOnboardingRoute: isOnboardingRoute(req),
    isAdminRoute: isAdminRoute(req),
    isPendingApprovalRoute: isPendingApprovalRoute(req),
    isRejectedRoute: isRejectedRoute(req),
    isPlatformAdmin,
    approvalRequired: isApprovalRequired(),
    approvalStatus,
  });

  switch (decision.type) {
    case "requireAuth":
      await auth.protect();
      return NextResponse.next();
    case "redirect":
      return NextResponse.redirect(new URL(decision.to, req.url));
    case "next":
      return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Next.js の内部パス・静的アセットを除いた全ルートにミドルウェアを適用する
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // API / tRPC ルートには常に適用する
    "/(api|trpc)(.*)",
    // Clerk のフロントエンドAPI用ルートには常に適用する
    "/__clerk/(.*)",
  ],
};

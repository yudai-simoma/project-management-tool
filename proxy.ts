/**
 * ルート保護（Clerk）。
 *
 * Next.js 16 で `middleware.ts` は `proxy.ts` にリネームされた（挙動・書き方は同じ、
 * ファイル名のみの変更。`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
 * 参照）。実際の判定ロジック（未サインイン→認証要求、組織未所属→`/onboarding` 等）は
 * `lib/auth/route-guard.ts` の `decideRouteGuard`（純粋関数）に切り出している。ここでは
 * Clerk の `auth()`/`NextRequest` から必要な値を取り出し、判定結果に応じた
 * `NextResponse` を組み立てるだけにする。
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { decideRouteGuard } from "@/lib/auth/route-guard";

const isPublicAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth();

  const decision = decideRouteGuard({
    hasUserId: Boolean(userId),
    hasOrgId: Boolean(orgId),
    isPublicAuthRoute: isPublicAuthRoute(req),
    isOnboardingRoute: isOnboardingRoute(req),
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

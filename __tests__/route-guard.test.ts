import { describe, expect, it } from "vitest";

import { decideRouteGuard } from "@/lib/auth/route-guard";

describe("decideRouteGuard", () => {
  it("未サインインは、公開ルート以外で認証を要求する", () => {
    expect(
      decideRouteGuard({
        hasUserId: false,
        hasOrgId: false,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
      }),
    ).toEqual({ type: "requireAuth" });
  });

  it("未サインインで /sign-in・/sign-up は素通しする", () => {
    expect(
      decideRouteGuard({
        hasUserId: false,
        hasOrgId: false,
        isPublicAuthRoute: true,
        isOnboardingRoute: false,
      }),
    ).toEqual({ type: "next" });
  });

  it("サインイン済み＋組織所属済みで /sign-in にアクセスすると / へ戻す", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: true,
        isPublicAuthRoute: true,
        isOnboardingRoute: false,
      }),
    ).toEqual({ type: "redirect", to: "/" });
  });

  it("サインイン済みだが組織未所属で /sign-in にアクセスすると素通しする（まだ onboarding 前）", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: false,
        isPublicAuthRoute: true,
        isOnboardingRoute: false,
      }),
    ).toEqual({ type: "next" });
  });

  it("サインイン済みだが組織未所属は /onboarding へリダイレクトする", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: false,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
      }),
    ).toEqual({ type: "redirect", to: "/onboarding" });
  });

  it("組織未所属で /onboarding 自体にアクセスすると素通しする", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: false,
        isPublicAuthRoute: false,
        isOnboardingRoute: true,
      }),
    ).toEqual({ type: "next" });
  });

  it("組織所属済みで /onboarding にアクセスすると / へ戻す", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: true,
        isPublicAuthRoute: false,
        isOnboardingRoute: true,
      }),
    ).toEqual({ type: "redirect", to: "/" });
  });

  it("サインイン済み＋組織所属済みは通常ルートを素通しする", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: true,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
      }),
    ).toEqual({ type: "next" });
  });
});

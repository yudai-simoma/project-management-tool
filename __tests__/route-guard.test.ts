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

describe("decideRouteGuard: 会員承認制（/admin・/pending-approval・/rejected）", () => {
  it("/admin は未サインインなら認証を要求する", () => {
    expect(
      decideRouteGuard({
        hasUserId: false,
        hasOrgId: false,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        isAdminRoute: true,
      }),
    ).toEqual({ type: "requireAuth" });
  });

  it("/admin はサインイン済みなら組織未所属・未承認でも素通しする（実際の管理者判定は app/admin/layout.tsx に委ねる）", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: false,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        isAdminRoute: true,
        approvalStatus: "pending",
      }),
    ).toEqual({ type: "next" });
  });

  it("未承認（pending）は /pending-approval 以外へのアクセスで /pending-approval へリダイレクトする", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: true,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        approvalStatus: "pending",
      }),
    ).toEqual({ type: "redirect", to: "/pending-approval" });
  });

  it("承認ゲート無効のデモ環境では未承認（pending）でも通常ルートを素通しする", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: true,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        approvalRequired: false,
        approvalStatus: "pending",
      }),
    ).toEqual({ type: "next" });
  });

  it("未承認（pending）は /pending-approval 自体を素通しする", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: false,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        isPendingApprovalRoute: true,
        approvalStatus: "pending",
      }),
    ).toEqual({ type: "next" });
  });

  it("却下済み（rejected）は /rejected 以外へのアクセスで /rejected へリダイレクトする", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: true,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        approvalStatus: "rejected",
      }),
    ).toEqual({ type: "redirect", to: "/rejected" });
  });

  it("却下済み（rejected）は /rejected 自体を素通しする", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: false,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        isRejectedRoute: true,
        approvalStatus: "rejected",
      }),
    ).toEqual({ type: "next" });
  });

  it("プラットフォーム管理者は未承認（pending）でも承認ゲートを素通りする（締め出し防止のフェイルセーフ）", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: true,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        isPlatformAdmin: true,
        approvalStatus: "pending",
      }),
    ).toEqual({ type: "next" });
  });

  it("プラットフォーム管理者は却下済み（rejected）でも承認ゲートを素通りする（締め出し防止のフェイルセーフ）", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: false,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        isPlatformAdmin: true,
        approvalStatus: "rejected",
      }),
    ).toEqual({ type: "redirect", to: "/onboarding" });
  });

  it("承認済みユーザーが /pending-approval にアクセスすると、組織所属済みなら / へ戻す", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: true,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        isPendingApprovalRoute: true,
        approvalStatus: "approved",
      }),
    ).toEqual({ type: "redirect", to: "/" });
  });

  it("承認ゲート無効のデモ環境で /pending-approval にアクセスすると / へ戻す", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: true,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        isPendingApprovalRoute: true,
        approvalRequired: false,
        approvalStatus: "pending",
      }),
    ).toEqual({ type: "redirect", to: "/" });
  });

  it("承認済みユーザーが /rejected にアクセスすると、組織未所属なら /onboarding へ戻す", () => {
    expect(
      decideRouteGuard({
        hasUserId: true,
        hasOrgId: false,
        isPublicAuthRoute: false,
        isOnboardingRoute: false,
        isRejectedRoute: true,
        approvalStatus: "approved",
      }),
    ).toEqual({ type: "redirect", to: "/onboarding" });
  });
});

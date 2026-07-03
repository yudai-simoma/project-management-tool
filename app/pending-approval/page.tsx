import { SignOutActionButton } from "@/components/auth/SignOutActionButton";

/**
 * 承認待ち中の案内画面。`proxy.ts` が、サインイン済みだが
 * `approvalStatus !== "approved"`（かつプラットフォーム管理者でもない）ユーザーを
 * ここへ誘導する（`docs/feedback-implementation-plan.md` ステップ1）。
 * ワークスペースの中身は一切見せない。
 */
export default function PendingApprovalPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-6 py-10 text-center">
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-lg font-semibold text-foreground">
          承認をお待ちください
        </h1>
        <p className="text-sm text-muted-foreground">
          アカウントは現在、サービス運営者による承認待ちです。承認されると
          ワークスペースを利用できるようになります。しばらくお待ちください。
        </p>
      </div>
      <SignOutActionButton />
    </main>
  );
}

import { SignOutActionButton } from "@/components/auth/SignOutActionButton";

/**
 * 却下済み（または利用停止済み）ユーザー向けの案内画面。`proxy.ts` が
 * `approvalStatus === "rejected"` のユーザーをここへ誘導する
 * （`docs/feedback-implementation-plan.md` ステップ1）。ワークスペースの中身は
 * 一切見せない。
 */
export default function RejectedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-6 py-10 text-center">
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-lg font-semibold text-foreground">
          このアカウントはご利用いただけません
        </h1>
        <p className="text-sm text-muted-foreground">
          サービス運営者の判断により、このアカウントでのワークスペース利用は
          許可されていません。心当たりがない場合は、サービス運営者にお問い合わせください。
        </p>
      </div>
      <SignOutActionButton />
    </main>
  );
}

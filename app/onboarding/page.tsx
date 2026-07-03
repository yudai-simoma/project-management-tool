import { OrganizationList } from "@clerk/nextjs";

/**
 * 組織作成・組織参加のオンボーディング導線。
 *
 * 「組織 = ワークスペース」「組織所属を必須化し、個人ワークスペースは許可しない」
 * という決定（`docs/mock-implementation-plan.md` §2.4, §9.2）に基づき、サインイン済みで
 * アクティブな組織を持たないユーザーは `proxy.ts`（旧 `middleware.ts`）によって本ページへ誘導される。
 *
 * Clerk の `OrganizationList` は「既存の組織一覧（選択して切替）」「招待されている組織
 * （参加）」「新規組織の作成」をひとつのコンポーネントでまとめて提供するため、
 * 独自に組織作成・招待受諾フォームを実装しない（`hidePersonal` で個人アカウントの
 * 選択肢は非表示にする）。
 */
export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-6 py-10">
      <div className="flex max-w-md flex-col gap-2 text-center">
        <h1 className="text-lg font-semibold text-foreground">
          ワークスペースに参加してください
        </h1>
        <p className="text-sm text-muted-foreground">
          このツールは組織（ワークスペース）単位で利用します。新しい組織を作成するか、
          招待されている組織に参加してください。
        </p>
      </div>
      <OrganizationList
        hidePersonal
        afterCreateOrganizationUrl="/"
        afterSelectOrganizationUrl="/"
      />
    </main>
  );
}

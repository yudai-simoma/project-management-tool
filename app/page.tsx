import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Workspace } from "@/components/workspace/Workspace";
import workspaceData from "@/data/workspace.json";
import { listProjectsWithTasks } from "@/db/repositories/projects";
import { listActiveMembers } from "@/lib/clerk/org-members";
import { isApprovalRequired } from "@/lib/auth/approval";
import { workspaceSchema } from "@/lib/schema";

// DB（Neon）から都度データを取得するため、ビルド時の静的プリレンダリング対象にしない。
// これにより `DATABASE_URL` 未設定の環境（Neonプロジェクト未作成時）でも
// `next build` 自体は通り、実際にアクセスされた時点でのみ DB 接続を必要とする。
export const dynamic = "force-dynamic";

export default async function Page() {
  // 通常は `proxy.ts`（旧 `middleware.ts`）が未サインイン・組織未所属のリクエストを事前に弾くため
  // ここに到達する時点で `orgId` は存在するはずだが、念のため防御的にも確認する。
  const { orgId } = await auth();
  if (!orgId) redirect("/onboarding");

  const wsResult = workspaceSchema.safeParse(workspaceData);
  if (!wsResult.success) {
    throw new Error(
      `データの形式が正しくありません:\nworkspace.json: ${wsResult.error.issues[0]?.message}`,
    );
  }

  // Project(+Task) は組織（orgId）でスコープしたうえで Neon(DB) から直接取得する
  // （Server Component）。Member はセクション4で Clerk Organizations API に完全移行した
  // ため、DBではなく Clerk から組織所属メンバー（承諾済みのみ）を取得する。ワークスペース名・
  // アイコンはまだDB化していないため data/workspace.json のまま。
  const [members, projects] = await Promise.all([
    listActiveMembers(orgId),
    listProjectsWithTasks(orgId),
  ]);

  return (
    <Workspace
      initialMembers={members}
      initialProjects={projects}
      workspace={wsResult.data}
      demoModeActive={!isApprovalRequired()}
    />
  );
}

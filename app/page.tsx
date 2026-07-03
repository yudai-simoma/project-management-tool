import { Workspace } from "@/components/workspace/Workspace";
import workspaceData from "@/data/workspace.json";
import { listCategories } from "@/db/repositories/categories";
import { listMembers } from "@/db/repositories/members";
import { listProjectsWithTasks } from "@/db/repositories/projects";
import { workspaceSchema } from "@/lib/schema";

// DB（Neon）から都度データを取得するため、ビルド時の静的プリレンダリング対象にしない。
// これにより `DATABASE_URL` 未設定の環境（Neonプロジェクト未作成時）でも
// `next build` 自体は通り、実際にアクセスされた時点でのみ DB 接続を必要とする。
export const dynamic = "force-dynamic";

export default async function Page() {
  const wsResult = workspaceSchema.safeParse(workspaceData);
  if (!wsResult.success) {
    throw new Error(
      `データの形式が正しくありません:\nworkspace.json: ${wsResult.error.issues[0]?.message}`,
    );
  }

  // Category/Member/Project(+Task) は Neon(DB) から直接取得する（Server Component）。
  // ワークスペース名・アイコンはまだDB化していないため data/workspace.json のまま。
  const [categories, members, projects] = await Promise.all([
    listCategories(),
    listMembers(),
    listProjectsWithTasks(),
  ]);

  return (
    <Workspace
      initialCategories={categories}
      initialMembers={members}
      initialProjects={projects}
      workspace={wsResult.data}
    />
  );
}

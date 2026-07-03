/**
 * `data/*.json`（zod でパース済みのドメインオブジェクト）を、Drizzle の insert 用
 * 行データに変換する純粋関数群。
 *
 * DB 接続を必要としないため Vitest で直接検証できる（`db/seed.ts` 側は本関数の
 * 結果を使って実際の insert を行うだけにし、ロジックの二重管理を避ける）。
 *
 * セクション3で `orgId` を追加した。シードデータは単一組織向けのため、呼び出し側
 * （`db/seed.ts`）が環境変数 `SEED_ORG_ID` から1つの組織IDを渡し、categories/projects/
 * tasks の全行にスタンプする。`members` はセクション4で Clerk Organizations API に
 * 完全移行したため、シード対象から除外した（メンバーは Clerk 側で組織を作成した時点で
 * 既に存在する）。
 */

import type { Category, Project } from "@/lib/schema";

import type { NewCategoryRow, NewProjectRow, NewTaskRow } from "./schema";

export type SeedRows = {
  categoryRows: NewCategoryRow[];
  projectRows: NewProjectRow[];
  taskRows: NewTaskRow[];
};

/**
 * `categories`/`projects` の配列順を、そのまま `sortOrder` として採番する
 * （モックの JSON 配列順 = カンバン上の表示順、という現行の仕様をそのまま引き継ぐ）。
 * `tasks` の `sortOrder` はプロジェクトごとに 0 起算で振り直す。
 */
export function buildSeedRows(
  categories: Category[],
  projects: Project[],
  orgId: string,
): SeedRows {
  const categoryRows: NewCategoryRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    orgId,
  }));

  const projectRows: NewProjectRow[] = projects.map((p, index) => ({
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    status: p.status,
    deadline: p.deadline,
    sortOrder: index,
    orgId,
  }));

  const taskRows: NewTaskRow[] = projects.flatMap((p) =>
    p.tasks.map((t, index) => ({
      id: t.id,
      projectId: p.id,
      title: t.title,
      done: t.done,
      dueDate: t.dueDate,
      assigneeId: t.assigneeId,
      memo: t.memo,
      sortOrder: index,
      orgId,
    })),
  );

  return { categoryRows, projectRows, taskRows };
}

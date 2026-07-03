/**
 * `data/*.json`（zod でパース済みのドメインオブジェクト）を、Drizzle の insert 用
 * 行データに変換する純粋関数群。
 *
 * DB 接続を必要としないため Vitest で直接検証できる（`db/seed.ts` 側は本関数の
 * 結果を使って実際の insert を行うだけにし、ロジックの二重管理を避ける）。
 *
 * セクション3で `orgId` を追加した。シードデータは単一組織向けのため、呼び出し側
 * （`db/seed.ts`）が環境変数 `SEED_ORG_ID` から1つの組織IDを渡し、projects/tasks の
 * 全行にスタンプする。`members` はセクション4で Clerk Organizations API に完全移行したため、
 * シード対象から除外した（メンバーは Clerk 側で組織を作成した時点で既に存在する）。
 */

import type { Project } from "@/lib/schema";
import {
  DEFAULT_LARGE_TASK_TITLE,
  getDefaultLargeTaskId,
} from "@/lib/task-hierarchy";

import type { NewProjectRow, NewTaskRow } from "./schema";

export type SeedRows = {
  projectRows: NewProjectRow[];
  taskRows: NewTaskRow[];
};

/**
 * `projects` の配列順を、そのまま `sortOrder` として採番する（モックの JSON 配列順 =
 * カンバン上の表示順、という現行の仕様をそのまま引き継ぐ）。旧JSONの軽量タスクは、
 * 各プロジェクトに作るデフォルト大項目「未分類」配下の小項目として投入する。
 */
export function buildSeedRows(
  projects: Project[],
  orgId: string,
): SeedRows {
  const projectRows: NewProjectRow[] = projects.map((p, index) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    deadline: p.deadline,
    sortOrder: index,
    orgId,
  }));

  const taskRows: NewTaskRow[] = projects.flatMap((p) => {
    const parentTaskId = getDefaultLargeTaskId(p.id);
    return [
      {
        id: parentTaskId,
        projectId: p.id,
        parentTaskId: null,
        level: "large",
        title: DEFAULT_LARGE_TASK_TITLE,
        done: false,
        dueDate: "",
        assigneeId: "",
        memo: "",
        sortOrder: 0,
        orgId,
      },
      ...p.tasks.map((t, index) => ({
        id: t.id,
        projectId: p.id,
        parentTaskId,
        level: "small" as const,
        title: t.title,
        done: t.done,
        dueDate: t.dueDate,
        assigneeId: t.assigneeId,
        memo: t.memo,
        sortOrder: index,
        orgId,
      })),
    ];
  });

  return { projectRows, taskRows };
}

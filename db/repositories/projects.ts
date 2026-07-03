/**
 * `projects` テーブルへのアクセスを集約するリポジトリ層。
 *
 * `Project` ドメイン型は `tasks` を nest した形（`lib/schema.ts`）のため、一覧・詳細取得では
 * 対応する `tasks` 行も合わせて取得して組み立てる。
 */

import { asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  projects,
  tasks,
  type ProjectRowDb,
  type TaskRowDb,
} from "@/db/schema";
import type { Project, ProjectStatusKey } from "@/lib/schema";

import { toTask } from "./tasks";

function toProject(row: ProjectRowDb, taskRows: TaskRowDb[]): Project {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    status: row.status,
    deadline: row.deadline,
    tasks: taskRows.map(toTask),
  };
}

/** 全プロジェクトを、配下タスク込みで取得する。並び順は `sortOrder` 昇順。 */
export async function listProjectsWithTasks(): Promise<Project[]> {
  const projectRows = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.sortOrder));
  if (projectRows.length === 0) return [];

  const taskRows = await db
    .select()
    .from(tasks)
    .where(
      inArray(
        tasks.projectId,
        projectRows.map((p) => p.id),
      ),
    )
    .orderBy(asc(tasks.sortOrder));

  const tasksByProject = new Map<string, TaskRowDb[]>();
  for (const t of taskRows) {
    const list = tasksByProject.get(t.projectId) ?? [];
    list.push(t);
    tasksByProject.set(t.projectId, list);
  }

  return projectRows.map((p) => toProject(p, tasksByProject.get(p.id) ?? []));
}

/** 新規プロジェクトを末尾（`sortOrder` 最大 + 1）に追加する。タスクは空配列。 */
export async function createProject(input: {
  id: string;
  name: string;
  categoryId: string;
  status: ProjectStatusKey;
  deadline: string;
}): Promise<Project> {
  const [{ maxSort }] = await db
    .select({
      maxSort: sql<number>`coalesce(max(${projects.sortOrder}), -1)`,
    })
    .from(projects);

  const [row] = await db
    .insert(projects)
    .values({ ...input, sortOrder: maxSort + 1 })
    .returning();
  return toProject(row, []);
}

export async function updateProject(
  id: string,
  patch: Partial<{
    name: string;
    categoryId: string;
    status: ProjectStatusKey;
    deadline: string;
  }>,
): Promise<Project | null> {
  const [row] = await db
    .update(projects)
    .set(patch)
    .where(eq(projects.id, id))
    .returning();
  if (!row) return null;

  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, id))
    .orderBy(asc(tasks.sortOrder));
  return toProject(row, taskRows);
}

/** プロジェクトを削除する。配下タスクは `onDelete: "cascade"` により自動的に削除される。 */
export async function deleteProject(id: string): Promise<boolean> {
  const deleted = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });
  return deleted.length > 0;
}

/**
 * D&D 並び替え（Pane 2 カンバン）の確定時に、影響を受けた新しい全体順序をまとめて
 * 反映する（「移動確定後の projects 配列全体の並びを、まとめて1回のAPI呼び出しで
 * 再採番して送る」という §2 で確認した方針）。
 *
 * `drizzle-orm/neon-http` は複数ステートメントにまたがるトランザクションを
 * サポートしないため（`db/seed.ts` と同様）、1件ずつ逐次更新する。
 */
export async function reorderProjects(
  items: { id: string; status: ProjectStatusKey; sortOrder: number }[],
): Promise<void> {
  for (const item of items) {
    await db
      .update(projects)
      .set({ status: item.status, sortOrder: item.sortOrder })
      .where(eq(projects.id, item.id));
  }
}

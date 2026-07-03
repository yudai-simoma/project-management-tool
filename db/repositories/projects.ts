/**
 * `projects` テーブルへのアクセスを集約するリポジトリ層。
 *
 * `Project` ドメイン型は `tasks` を nest した形（`lib/schema.ts`）のため、一覧・詳細取得では
 * 対応する `tasks` 行も合わせて取得して組み立てる。
 *
 * セクション3で全関数に `orgId` を追加し、組織単位でデータをスコープしている
 * （`sortOrder` の採番も組織内で完結させる。他組織のプロジェクト件数の影響を受けない）。
 */

import { and, asc, eq, inArray, sql } from "drizzle-orm";

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
    categoryId: "",
    status: row.status,
    deadline: row.deadline,
    tasks: taskRows.map(toTask),
  };
}

/** 組織内の全プロジェクトを、配下タスク込みで取得する。並び順は `sortOrder` 昇順。 */
export async function listProjectsWithTasks(orgId: string): Promise<Project[]> {
  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId))
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

/** 新規プロジェクトを組織内の末尾（`sortOrder` 最大 + 1）に追加する。タスクは空配列。 */
export async function createProject(
  orgId: string,
  input: {
    id: string;
    name: string;
    /** @deprecated カテゴリ廃止後は保存しない。4-CまでのAPI互換用。 */
    categoryId: string;
    status: ProjectStatusKey;
    deadline: string;
  },
): Promise<Project> {
  const [{ maxSort }] = await db
    .select({
      maxSort: sql<number>`coalesce(max(${projects.sortOrder}), -1)`,
    })
    .from(projects)
    .where(eq(projects.orgId, orgId));

  const [row] = await db
    .insert(projects)
    .values({
      id: input.id,
      name: input.name,
      status: input.status,
      deadline: input.deadline,
      orgId,
      sortOrder: maxSort + 1,
    })
    .returning();
  return toProject(row, []);
}

export async function updateProject(
  orgId: string,
  id: string,
  patch: Partial<{
    name: string;
    /** @deprecated カテゴリ廃止後は保存しない。4-CまでのAPI互換用。 */
    categoryId: string;
    status: ProjectStatusKey;
    deadline: string;
  }>,
): Promise<Project | null> {
  const projectPatch = {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.deadline !== undefined && { deadline: patch.deadline }),
  };
  if (Object.keys(projectPatch).length === 0) {
    const [existingRow] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.orgId, orgId)));
    if (!existingRow) return null;

    const taskRows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, id))
      .orderBy(asc(tasks.sortOrder));
    return toProject(existingRow, taskRows);
  }

  const [row] = await db
    .update(projects)
    .set(projectPatch)
    .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
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
export async function deleteProject(
  orgId: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
    .returning({ id: projects.id });
  return deleted.length > 0;
}

/**
 * D&D 並び替え（Pane 2 カンバン）の確定時に、影響を受けた新しい全体順序をまとめて
 * 反映する（「移動確定後の projects 配列全体の並びを、まとめて1回のAPI呼び出しで
 * 再採番して送る」という §2 で確認した方針）。
 *
 * `drizzle-orm/neon-http` は複数ステートメントにまたがるトランザクションを
 * サポートしないため（`db/seed.ts` と同様）、1件ずつ逐次更新する。`orgId` の
 * 一致も条件に含め、他組織のプロジェクトIDが紛れ込んでいても更新されないようにする。
 */
export async function reorderProjects(
  orgId: string,
  items: { id: string; status: ProjectStatusKey; sortOrder: number }[],
): Promise<void> {
  for (const item of items) {
    await db
      .update(projects)
      .set({ status: item.status, sortOrder: item.sortOrder })
      .where(and(eq(projects.id, item.id), eq(projects.orgId, orgId)));
  }
}

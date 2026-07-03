/**
 * `tasks` テーブルへのアクセスを集約するリポジトリ層。
 *
 * `toTask` は `projects.ts` のリポジトリ（プロジェクト取得時にタスクを nest させる）
 * からも共有で使うため export する。
 *
 * セクション3で `orgId` によるスコープを追加した。`tasks.orgId` は `projects.orgId` の
 * 非正規化コピー（`db/schema.ts` のコメント参照）で、`createTask` は追加対象の
 * プロジェクトが呼び出し元の組織に属するかを確認したうえでコピーする。
 */

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { projects, tasks, type TaskRowDb } from "@/db/schema";
import type { Task } from "@/lib/schema";

export function toTask(row: TaskRowDb): Task {
  return {
    id: row.id,
    parentTaskId: row.parentTaskId,
    level: row.level,
    title: row.title,
    done: row.done,
    dueDate: row.dueDate,
    assigneeId: row.assigneeId,
    memo: row.memo,
  };
}

/**
 * `projectId` が組織に属していれば `orgId` を返し、属していなければ（存在しない、
 * または他組織のプロジェクト）`null` を返す。
 */
async function resolveProjectOrgId(
  orgId: string,
  projectId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
  return row ? orgId : null;
}

async function getTaskRowById(
  orgId: string,
  id: string,
): Promise<TaskRowDb | null> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));
  return row ?? null;
}

async function isValidTaskPlacement(
  orgId: string,
  projectId: string,
  level: Task["level"],
  parentTaskId: string | null,
  taskId?: string,
): Promise<boolean> {
  if (level === "large") return parentTaskId === null;
  if (!parentTaskId) return false;
  if (parentTaskId === taskId) return false;

  const parent = await getTaskRowById(orgId, parentTaskId);
  if (!parent || parent.projectId !== projectId) return false;
  if (level === "medium") return parent.level === "large";
  return parent.level === "large" || parent.level === "medium";
}

export async function createTask(
  orgId: string,
  projectId: string,
  input: {
    id: string;
    title: string;
    parentTaskId?: string | null;
    level?: Task["level"];
    done?: boolean;
    dueDate?: string;
    assigneeId?: string;
    memo?: string;
  },
): Promise<Task | null> {
  const resolvedOrgId = await resolveProjectOrgId(orgId, projectId);
  if (!resolvedOrgId) return null;
  const level = input.level ?? "small";
  const parentTaskId = input.parentTaskId ?? null;
  const validPlacement = await isValidTaskPlacement(
    orgId,
    projectId,
    level,
    parentTaskId,
    input.id,
  );
  if (!validPlacement) return null;

  const [{ maxSort }] = await db
    .select({ maxSort: sql<number>`coalesce(max(${tasks.sortOrder}), -1)` })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  const [row] = await db
    .insert(tasks)
    .values({
      id: input.id,
      projectId,
      parentTaskId,
      level,
      orgId: resolvedOrgId,
      title: input.title,
      done: input.done ?? false,
      dueDate: input.dueDate ?? "",
      assigneeId: input.assigneeId ?? "",
      memo: input.memo ?? "",
      sortOrder: maxSort + 1,
    })
    .returning();
  return toTask(row);
}

export async function updateTask(
  orgId: string,
  id: string,
  patch: Partial<{
    title: string;
    parentTaskId: string | null;
    level: Task["level"];
    done: boolean;
    dueDate: string;
    assigneeId: string;
    memo: string;
  }>,
): Promise<Task | null> {
  const existing = await getTaskRowById(orgId, id);
  if (!existing) return null;

  const nextLevel = patch.level ?? existing.level;
  const nextParentTaskId =
    patch.parentTaskId !== undefined ? patch.parentTaskId : existing.parentTaskId;
  const validPlacement = await isValidTaskPlacement(
    orgId,
    existing.projectId,
    nextLevel,
    nextParentTaskId,
    id,
  );
  if (!validPlacement) return null;

  const [row] = await db
    .update(tasks)
    .set(patch)
    .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)))
    .returning();
  return row ? toTask(row) : null;
}

export async function getTaskById(
  orgId: string,
  id: string,
): Promise<Task | null> {
  const row = await getTaskRowById(orgId, id);
  return row ? toTask(row) : null;
}

export async function deleteTask(orgId: string, id: string): Promise<boolean> {
  const allRows = await db.select().from(tasks).where(eq(tasks.orgId, orgId));
  const descendants = collectDescendantIds(allRows, id);
  const deleted = await db
    .delete(tasks)
    .where(and(inArray(tasks.id, [id, ...descendants]), eq(tasks.orgId, orgId)))
    .returning({ id: tasks.id });
  return deleted.length > 0;
}

function collectDescendantIds(rows: TaskRowDb[], parentId: string): string[] {
  const result: string[] = [];
  const queue = [parentId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const row of rows) {
      if (row.parentTaskId === current) {
        result.push(row.id);
        queue.push(row.id);
      }
    }
  }
  return result;
}

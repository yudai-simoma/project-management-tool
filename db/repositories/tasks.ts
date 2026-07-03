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

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { projects, tasks, type TaskRowDb } from "@/db/schema";
import type { Task } from "@/lib/schema";

export function toTask(row: TaskRowDb): Task {
  return {
    id: row.id,
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

export async function createTask(
  orgId: string,
  projectId: string,
  input: {
    id: string;
    title: string;
    done?: boolean;
    dueDate?: string;
    assigneeId?: string;
    memo?: string;
  },
): Promise<Task | null> {
  const resolvedOrgId = await resolveProjectOrgId(orgId, projectId);
  if (!resolvedOrgId) return null;

  const [{ maxSort }] = await db
    .select({ maxSort: sql<number>`coalesce(max(${tasks.sortOrder}), -1)` })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  const [row] = await db
    .insert(tasks)
    .values({
      id: input.id,
      projectId,
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
    done: boolean;
    dueDate: string;
    assigneeId: string;
    memo: string;
  }>,
): Promise<Task | null> {
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
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));
  return row ? toTask(row) : null;
}

export async function deleteTask(orgId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)))
    .returning({ id: tasks.id });
  return deleted.length > 0;
}

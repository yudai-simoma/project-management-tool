/**
 * `tasks` テーブルへのアクセスを集約するリポジトリ層。
 *
 * `toTask` は `projects.ts` のリポジトリ（プロジェクト取得時にタスクを nest させる）
 * からも共有で使うため export する。
 */

import { eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { tasks, type TaskRowDb } from "@/db/schema";
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

export async function createTask(
  projectId: string,
  input: {
    id: string;
    title: string;
    done?: boolean;
    dueDate?: string;
    assigneeId?: string;
    memo?: string;
  },
): Promise<Task> {
  const [{ maxSort }] = await db
    .select({ maxSort: sql<number>`coalesce(max(${tasks.sortOrder}), -1)` })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  const [row] = await db
    .insert(tasks)
    .values({
      id: input.id,
      projectId,
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
    .where(eq(tasks.id, id))
    .returning();
  return row ? toTask(row) : null;
}

export async function deleteTask(id: string): Promise<boolean> {
  const deleted = await db
    .delete(tasks)
    .where(eq(tasks.id, id))
    .returning({ id: tasks.id });
  return deleted.length > 0;
}

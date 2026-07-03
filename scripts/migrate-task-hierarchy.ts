/**
 * 既存の軽量タスクを、ステップ4-Bで確定した3階層モデルへ移行する。
 *
 * 実行方法:
 *   npm run migrate:task-hierarchy
 *
 * `npm run db:migrate` で構造マイグレーションを適用した後に実行する。
 * 冪等にしてあり、同じDBに複数回実行してもデフォルト大項目は重複せず、
 * 既に親を持つタスクは上書きしない。
 */

import { and, eq, isNull, ne } from "drizzle-orm";
import { pathToFileURL } from "node:url";

import { db } from "@/db/client";
import { projects, tasks } from "@/db/schema";
import {
  DEFAULT_LARGE_TASK_TITLE,
  getDefaultLargeTaskId,
} from "@/lib/task-hierarchy";

export async function migrateTaskHierarchy() {
  const projectRows = await db
    .select({ id: projects.id, orgId: projects.orgId })
    .from(projects);

  let createdParents = 0;
  let updatedChildren = 0;

  for (const project of projectRows) {
    const parentTaskId = getDefaultLargeTaskId(project.id);
    const [existingParent] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, parentTaskId));

    if (!existingParent) {
      await db.insert(tasks).values({
        id: parentTaskId,
        projectId: project.id,
        parentTaskId: null,
        level: "large",
        title: DEFAULT_LARGE_TASK_TITLE,
        done: false,
        dueDate: "",
        assigneeId: "",
        memo: "",
        sortOrder: 0,
        orgId: project.orgId,
      });
      createdParents += 1;
    }

    const updated = await db
      .update(tasks)
      .set({ parentTaskId, level: "small" })
      .where(
        and(
          eq(tasks.projectId, project.id),
          ne(tasks.id, parentTaskId),
          isNull(tasks.parentTaskId),
        ),
      )
      .returning({ id: tasks.id });
    updatedChildren += updated.length;
  }

  return {
    projects: projectRows.length,
    createdParents,
    updatedChildren,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrateTaskHierarchy()
    .then((result) => {
      console.log(
        `完了: projects=${result.projects} ` +
          `createdParents=${result.createdParents} ` +
          `updatedChildren=${result.updatedChildren}`,
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("タスク階層移行でエラーが発生しました:", error);
      process.exit(1);
    });
}

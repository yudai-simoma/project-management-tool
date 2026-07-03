/**
 * `data/categories.json` / `data/members.json` / `data/projects.json` の内容を
 * Neon に投入するシードスクリプト。
 *
 * 実行方法: `npm run db:seed`（`.env.local` の読み込みは `db/client.ts` が行う）。
 *
 * 冪等性のため、投入前に既存の行を全削除してから再投入する（開発用シードのため。
 * 本番データを想定した差分マイグレーションではない）。削除順は外部キー制約に従い
 * tasks → projects → members → categories。
 */

import categoriesData from "@/data/categories.json";
import membersData from "@/data/members.json";
import projectsData from "@/data/projects.json";
import { categoriesSchema, membersSchema, projectsSchema } from "@/lib/schema";

import { db } from "./client";
import { buildSeedRows } from "./seed-data";
import { categories, members, projects, tasks } from "./schema";

async function main() {
  const categoriesResult = categoriesSchema.safeParse(categoriesData);
  const membersResult = membersSchema.safeParse(membersData);
  const projectsResult = projectsSchema.safeParse(projectsData);

  if (!categoriesResult.success || !membersResult.success || !projectsResult.success) {
    const errors = [
      !categoriesResult.success &&
        `categories.json: ${categoriesResult.error.issues[0]?.message}`,
      !membersResult.success &&
        `members.json: ${membersResult.error.issues[0]?.message}`,
      !projectsResult.success &&
        `projects.json: ${projectsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  const { categoryRows, memberRows, projectRows, taskRows } = buildSeedRows(
    categoriesResult.data,
    membersResult.data,
    projectsResult.data,
  );

  console.log("既存データを削除しています...");
  await db.delete(tasks);
  await db.delete(projects);
  await db.delete(members);
  await db.delete(categories);

  console.log("シードデータを投入しています...");
  if (categoryRows.length > 0) await db.insert(categories).values(categoryRows);
  if (memberRows.length > 0) await db.insert(members).values(memberRows);
  if (projectRows.length > 0) await db.insert(projects).values(projectRows);
  if (taskRows.length > 0) await db.insert(tasks).values(taskRows);

  console.log(
    `完了: categories=${categoryRows.length} members=${memberRows.length} ` +
      `projects=${projectRows.length} tasks=${taskRows.length}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("シード処理でエラーが発生しました:", error);
    process.exit(1);
  });

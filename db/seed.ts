/**
 * `data/projects.json` の内容を Neon に投入するシードスクリプト。
 *
 * 実行方法: `npm run db:seed`（`.env.local` の読み込みは `db/client.ts` が行う）。
 * `.env.local` に `SEED_ORG_ID`（Clerk Organizations の組織ID、`org_xxx`）の設定が
 * 必要（セクション3で `orgId` による組織スコープを導入したため）。Clerk Dashboard の
 * Organizations 一覧、または実際にアプリで組織を作成した後の URL 等から確認できる。
 *
 * メンバーはセクション4で Clerk Organizations API に完全移行したため、本スクリプトの
 * シード対象から除外した（`SEED_ORG_ID` の組織に Clerk 側で実際に招待・参加したメンバーが
 * そのままメンバー一覧になる）。`data/projects.json` の `assigneeId` は既存メンバー
 * （`m1` 等）への参照だったが、当該メンバーは存在しなくなったため空文字にしてある
 * （実メンバーへの再アサインは `npm run dev` 起動後にアプリの担当者選択から行う）。
 *
 * 冪等性のため、投入前に既存の行を全削除してから再投入する（開発用シードのため。
 * 本番データを想定した差分マイグレーションではない）。削除順は外部キー制約に従い
 * tasks → projects。
 */

import projectsData from "@/data/projects.json";
import { projectsSchema } from "@/lib/schema";

import { db } from "./client";
import { buildSeedRows } from "./seed-data";
import { projects, tasks } from "./schema";

async function main() {
  const orgId = process.env.SEED_ORG_ID;
  if (!orgId) {
    throw new Error(
      "SEED_ORG_ID が未設定です。.env.example を参考に .env.local に、投入先の " +
        "Clerk Organization ID（org_xxx）を設定してください。",
    );
  }

  const projectsResult = projectsSchema.safeParse(projectsData);

  if (!projectsResult.success) {
    const errors = [
      !projectsResult.success &&
        `projects.json: ${projectsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  const { projectRows, taskRows } = buildSeedRows(projectsResult.data, orgId);

  console.log("既存データを削除しています...");
  await db.delete(tasks);
  await db.delete(projects);

  console.log("シードデータを投入しています...");
  if (projectRows.length > 0) await db.insert(projects).values(projectRows);
  if (taskRows.length > 0) await db.insert(tasks).values(taskRows);

  console.log(
    `完了: projects=${projectRows.length} tasks=${taskRows.length}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("シード処理でエラーが発生しました:", error);
    process.exit(1);
  });

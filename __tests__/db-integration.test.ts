import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

/**
 * 実 Neon 接続を要する統合テスト。
 *
 * `.env.local` に `DATABASE_URL` が設定されていない環境（CI 含む）では自動的に
 * スキップする。ローカルで Neon プロジェクトを用意し `.env.local` を設定した状態で
 * `npm run test` を実行すると、接続確認とマイグレーション適用状況を検証できる。
 */
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)(
  "Neon 接続（実DBが必要。未設定時は自動スキップ）",
  () => {
    it("DB に接続でき、ステップ4-B後の projects/tasks テーブルが存在する", async () => {
      const { db } = await import("@/db/client");
      const result = await db.execute(
        sql`select table_name from information_schema.tables where table_schema = 'public'`,
      );
      const tableNames = result.rows.map((row) => row.table_name);
      expect(tableNames).toEqual(expect.arrayContaining(["projects", "tasks"]));
      expect(tableNames).not.toContain("categories");

      const taskColumns = await db.execute(
        sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'tasks'`,
      );
      const taskColumnNames = taskColumns.rows.map((row) => row.column_name);
      expect(taskColumnNames).toEqual(
        expect.arrayContaining(["parent_task_id", "level"]),
      );
    });
  },
);

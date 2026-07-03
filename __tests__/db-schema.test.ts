import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { categories, members, projects, tasks } from "@/db/schema";

/**
 * `db/schema.ts` の型・カラム設計に関する軽量ユニットテスト。
 * 実 DB 接続は不要（`@neondatabase/serverless` の HTTP クライアントを一切生成しない）。
 */
describe("db/schema", () => {
  it("テーブル名が snake_case で定義されている", () => {
    expect(getTableName(categories)).toBe("categories");
    expect(getTableName(members)).toBe("members");
    expect(getTableName(projects)).toBe("projects");
    expect(getTableName(tasks)).toBe("tasks");
  });

  it("categories テーブルが zod の Category スキーマに対応するカラムを持つ", () => {
    const columns = getTableColumns(categories);
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining(["id", "name"]),
    );
    expect(columns.id.primary).toBe(true);
    expect(columns.name.notNull).toBe(true);
  });

  it("members テーブルが zod の Member スキーマに対応するカラムを持つ", () => {
    const columns = getTableColumns(members);
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining(["id", "name", "role"]),
    );
    expect(columns.role.notNull).toBe(true);
    expect(columns.role.enumValues).toEqual(["owner", "admin", "member"]);
  });

  it("projects テーブルが zod の Project スキーマに対応するカラムを持ち、進捗率のような派生値カラムを持たない", () => {
    const columns = getTableColumns(projects);
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "categoryId",
        "status",
        "deadline",
      ]),
    );
    expect(columns.status.enumValues).toEqual([
      "planning",
      "inProgress",
      "review",
      "done",
    ]);
    expect(Object.keys(columns)).not.toContain("progress");
    expect(Object.keys(columns)).not.toContain("deadlineRisk");
  });

  it("tasks テーブルが zod の Task スキーマに対応するカラムを持つ", () => {
    const columns = getTableColumns(tasks);
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "id",
        "projectId",
        "title",
        "done",
        "dueDate",
        "assigneeId",
        "memo",
      ]),
    );
    expect(columns.done.notNull).toBe(true);
    expect(columns.done.default).toBe(false);
  });

  it("assigneeId には外部キー制約を付けない（未アサインの空文字を許容するため）", () => {
    const columns = getTableColumns(tasks);
    expect(columns.assigneeId.notNull).toBe(true);
    expect(columns.assigneeId.default).toBe("");
  });
});

/**
 * `categories` テーブルへのアクセスを集約するリポジトリ層。
 *
 * Route Handler から直接 `db`（Drizzle クライアント）を叩かず、必ずこの層を経由する。
 * テスト時は `vi.mock("@/db/repositories/categories")` で本モジュールごと差し替えることで、
 * 実DB接続なしに Route Handler のユニットテストができる（`docs/backend-implementation-plan.md`
 * セクション2のテスト方針）。
 */

import { asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { categories, projects, type CategoryRow } from "@/db/schema";
import type { Category } from "@/lib/schema";

function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name };
}

export async function listCategories(): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.createdAt));
  return rows.map(toCategory);
}

export async function createCategory(input: {
  id: string;
  name: string;
}): Promise<Category> {
  const [row] = await db.insert(categories).values(input).returning();
  return toCategory(row);
}

export async function updateCategoryName(
  id: string,
  name: string,
): Promise<Category | null> {
  const [row] = await db
    .update(categories)
    .set({ name })
    .where(eq(categories.id, id))
    .returning();
  return row ? toCategory(row) : null;
}

/**
 * カテゴリを削除する。既存UI文言（「配下のプロジェクトも含めて完全に削除され、
 * 元に戻せません」）に合わせ、配下のプロジェクトも連鎖的に削除する。
 *
 * `categories -> projects` の外部キーは `onDelete: "restrict"` のままにしているため
 * （誤ってカテゴリ単体を消してしまう事故を防ぐ既定の制約として残す）、ここでは
 * アプリ層で先にプロジェクトを削除してからカテゴリを削除する。プロジェクト配下の
 * タスクは `tasks -> projects` の `onDelete: "cascade"` により自動的に削除される。
 */
export async function deleteCategoryCascade(id: string): Promise<boolean> {
  await db.delete(projects).where(eq(projects.categoryId, id));
  const deleted = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return deleted.length > 0;
}

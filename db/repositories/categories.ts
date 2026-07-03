/**
 * `categories` テーブルへのアクセスを集約するリポジトリ層。
 *
 * Route Handler から直接 `db`（Drizzle クライアント）を叩かず、必ずこの層を経由する。
 * テスト時は `vi.mock("@/db/repositories/categories")` で本モジュールごと差し替えることで、
 * 実DB接続なしに Route Handler のユニットテストができる（`docs/backend-implementation-plan.md`
 * セクション2のテスト方針）。
 *
 * セクション3で全関数に `orgId` を追加し、組織単位でデータをスコープしている
 * （`orgId` は呼び出し側の Route Handler が Clerk の `auth()` から取得し、常に
 * リクエストボディではなくセッションから決定する）。
 */

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { categories, projects, type CategoryRow } from "@/db/schema";
import type { Category } from "@/lib/schema";

function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name };
}

export async function listCategories(orgId: string): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.orgId, orgId))
    .orderBy(asc(categories.createdAt));
  return rows.map(toCategory);
}

export async function createCategory(
  orgId: string,
  input: { id: string; name: string },
): Promise<Category> {
  const [row] = await db
    .insert(categories)
    .values({ ...input, orgId })
    .returning();
  return toCategory(row);
}

export async function updateCategoryName(
  orgId: string,
  id: string,
  name: string,
): Promise<Category | null> {
  const [row] = await db
    .update(categories)
    .set({ name })
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId)))
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
export async function deleteCategoryCascade(
  orgId: string,
  id: string,
): Promise<boolean> {
  await db
    .delete(projects)
    .where(and(eq(projects.categoryId, id), eq(projects.orgId, orgId)));
  const deleted = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId)))
    .returning({ id: categories.id });
  return deleted.length > 0;
}

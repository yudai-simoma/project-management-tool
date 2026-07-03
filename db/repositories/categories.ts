/**
 * @deprecated ステップ4-BでカテゴリはDBから廃止した。
 *
 * app/api/categories/** と一部UIは4-Cで削除・切替予定のため、Route Handler 本体には
 * 触れず、ビルド互換用の薄い shim として残す。
 */

import type { Category } from "@/lib/schema";

export async function listCategories(_orgId: string): Promise<Category[]> {
  void _orgId;
  return [];
}

export async function createCategory(
  _orgId: string,
  input: { id: string; name: string },
): Promise<Category> {
  void _orgId;
  return input;
}

export async function updateCategoryName(
  _orgId: string,
  _id: string,
  _name: string,
): Promise<Category | null> {
  void _orgId;
  void _id;
  void _name;
  return null;
}

export async function deleteCategoryCascade(
  _orgId: string,
  _id: string,
): Promise<boolean> {
  void _orgId;
  void _id;
  return false;
}

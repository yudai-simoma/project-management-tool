import { NextResponse } from "next/server";

import { reorderProjects } from "@/db/repositories/projects";
import { readJsonBody, zodErrorResponse } from "@/lib/api/respond";
import { reorderProjectsSchema } from "@/lib/api/schemas";

/**
 * Pane 2 の D&D 並び替え確定時に呼ばれる。移動確定後の projects 配列全体の並び順
 * （`status`/`sortOrder`）をまとめて1回のリクエストで送り、まとめて再採番する
 * （`docs/backend-implementation-plan.md` セクション2で確認した方針）。
 */
export async function PATCH(request: Request) {
  const body = await readJsonBody(request);
  const parsed = reorderProjectsSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  await reorderProjects(parsed.data.items);
  return new NextResponse(null, { status: 204 });
}

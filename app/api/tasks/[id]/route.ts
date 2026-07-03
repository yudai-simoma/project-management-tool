import { NextResponse } from "next/server";

import { deleteTask, getTaskById, updateTask } from "@/db/repositories/tasks";
import { requireOrgId } from "@/lib/api/auth";
import {
  forbiddenResponse,
  notFoundResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { updateTaskSchema } from "@/lib/api/schemas";
import { canDeleteTask, canManageOrg } from "@/lib/auth/permissions";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const task = await updateTask(ctx.orgId, id, parsed.data);
  if (!task) return notFoundResponse("タスクが見つかりません");
  return NextResponse.json(task);
}

// タスク削除は、担当者本人 または Owner/Admin に許可する（§6決定。他の削除操作より
// 一段階緩い理由: タスクは軽量運用前提で、自分がアサインされたタスクは自分で片付けられる
// ようにするため）。判定ロジックは `lib/auth/permissions.ts` の `canDeleteTask` を再利用する。
export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const task = await getTaskById(ctx.orgId, id);
  if (!task) return notFoundResponse("タスクが見つかりません");

  if (!canDeleteTask(canManageOrg(ctx.role), ctx.userId, task.assigneeId)) {
    return forbiddenResponse(
      "このタスクを削除できるのは担当者本人、またはOwner/Adminのみです",
    );
  }

  const deleted = await deleteTask(ctx.orgId, id);
  if (!deleted) return notFoundResponse("タスクが見つかりません");
  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";

import { deleteTask, updateTask } from "@/db/repositories/tasks";
import {
  notFoundResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { updateTaskSchema } from "@/lib/api/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const task = await updateTask(id, parsed.data);
  if (!task) return notFoundResponse("タスクが見つかりません");
  return NextResponse.json(task);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const deleted = await deleteTask(id);
  if (!deleted) return notFoundResponse("タスクが見つかりません");
  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";

import { createTask } from "@/db/repositories/tasks";
import { requireOrgId } from "@/lib/api/auth";
import {
  notFoundResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { createTaskSchema } from "@/lib/api/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const { id: projectId } = await params;
  const body = await readJsonBody(request);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const task = await createTask(ctx.orgId, projectId, parsed.data);
  if (!task) return notFoundResponse("プロジェクトが見つかりません");
  return NextResponse.json(task, { status: 201 });
}

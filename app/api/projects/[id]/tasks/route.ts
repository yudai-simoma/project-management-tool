import { NextResponse } from "next/server";

import { createTask } from "@/db/repositories/tasks";
import {
  notFoundResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { createTaskSchema } from "@/lib/api/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id: projectId } = await params;
  const body = await readJsonBody(request);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const task = await createTask(projectId, parsed.data);
    return NextResponse.json(task, { status: 201 });
  } catch {
    // `tasks.project_id` の外部キー制約違反（存在しないプロジェクトへの追加）。
    return notFoundResponse("プロジェクトが見つかりません");
  }
}

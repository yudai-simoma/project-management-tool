import { NextResponse } from "next/server";

import { deleteProject, updateProject } from "@/db/repositories/projects";
import {
  notFoundResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { updateProjectSchema } from "@/lib/api/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const project = await updateProject(id, parsed.data);
  if (!project) return notFoundResponse("プロジェクトが見つかりません");
  return NextResponse.json(project);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const deleted = await deleteProject(id);
  if (!deleted) return notFoundResponse("プロジェクトが見つかりません");
  return new NextResponse(null, { status: 204 });
}

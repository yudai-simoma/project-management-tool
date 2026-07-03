import { NextResponse } from "next/server";

import {
  createProject,
  listProjectsWithTasks,
} from "@/db/repositories/projects";
import { requireOrgId } from "@/lib/api/auth";
import { readJsonBody, zodErrorResponse } from "@/lib/api/respond";
import { createProjectSchema } from "@/lib/api/schemas";

export async function GET() {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const projects = await listProjectsWithTasks(ctx.orgId);
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const project = await createProject(ctx.orgId, parsed.data);
  return NextResponse.json(project, { status: 201 });
}

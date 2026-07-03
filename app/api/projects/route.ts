import { NextResponse } from "next/server";

import {
  createProject,
  listProjectsWithTasks,
} from "@/db/repositories/projects";
import { readJsonBody, zodErrorResponse } from "@/lib/api/respond";
import { createProjectSchema } from "@/lib/api/schemas";

export async function GET() {
  const projects = await listProjectsWithTasks();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const project = await createProject(parsed.data);
  return NextResponse.json(project, { status: 201 });
}

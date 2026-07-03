import { NextResponse } from "next/server";

import { createCategory, listCategories } from "@/db/repositories/categories";
import { requireOrgId } from "@/lib/api/auth";
import { readJsonBody, zodErrorResponse } from "@/lib/api/respond";
import { createCategorySchema } from "@/lib/api/schemas";

export async function GET() {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const categories = await listCategories(ctx.orgId);
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const category = await createCategory(ctx.orgId, parsed.data);
  return NextResponse.json(category, { status: 201 });
}

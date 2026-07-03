import { NextResponse } from "next/server";

import {
  deleteCategoryCascade,
  updateCategoryName,
} from "@/db/repositories/categories";
import {
  notFoundResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { updateCategorySchema } from "@/lib/api/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const category = await updateCategoryName(id, parsed.data.name);
  if (!category) return notFoundResponse("カテゴリが見つかりません");
  return NextResponse.json(category);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const deleted = await deleteCategoryCascade(id);
  if (!deleted) return notFoundResponse("カテゴリが見つかりません");
  return new NextResponse(null, { status: 204 });
}

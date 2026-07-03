import { NextResponse } from "next/server";

import { createCategory, listCategories } from "@/db/repositories/categories";
import { readJsonBody, zodErrorResponse } from "@/lib/api/respond";
import { createCategorySchema } from "@/lib/api/schemas";

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const category = await createCategory(parsed.data);
  return NextResponse.json(category, { status: 201 });
}

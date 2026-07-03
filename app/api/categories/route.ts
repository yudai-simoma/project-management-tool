import { NextResponse } from "next/server";

import { listCategories } from "@/db/repositories/categories";
import { requireOrgId } from "@/lib/api/auth";

export async function GET() {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const categories = await listCategories(ctx.orgId);
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "カテゴリは廃止されました" },
    { status: 410 },
  );
}

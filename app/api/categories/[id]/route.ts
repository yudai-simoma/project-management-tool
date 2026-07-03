import { NextResponse } from "next/server";

import { requireOrgId } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;
  void request;
  void (await params);
  return NextResponse.json(
    { error: "カテゴリは廃止されました" },
    { status: 410 },
  );
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;
  void (await params);
  return NextResponse.json(
    { error: "カテゴリは廃止されました" },
    { status: 410 },
  );
}

import { NextResponse } from "next/server";

import { deleteMember, updateMember } from "@/db/repositories/members";
import {
  notFoundResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { updateMemberSchema } from "@/lib/api/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const member = await updateMember(id, parsed.data);
  if (!member) return notFoundResponse("メンバーが見つかりません");
  return NextResponse.json(member);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const deleted = await deleteMember(id);
  if (!deleted) return notFoundResponse("メンバーが見つかりません");
  return new NextResponse(null, { status: 204 });
}

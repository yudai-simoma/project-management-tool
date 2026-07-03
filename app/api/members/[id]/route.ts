import { NextResponse } from "next/server";

import { removeMember, updateMemberRole } from "@/lib/clerk/org-members";
import { requireOrgId } from "@/lib/api/auth";
import {
  clerkErrorResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { updateMemberRoleSchema } from "@/lib/api/schemas";

type RouteParams = { params: Promise<{ id: string }> };

/** `id` は Clerk のユーザーID（`user_xxx`）。`lib/clerk/org-members.ts` 参照。 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const member = await updateMemberRole(ctx.orgId, id, parsed.data.role);
    return NextResponse.json(member);
  } catch (error) {
    return clerkErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  try {
    await removeMember(ctx.orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return clerkErrorResponse(error);
  }
}

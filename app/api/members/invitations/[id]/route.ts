import { NextResponse } from "next/server";

import { revokeInvitation } from "@/lib/clerk/org-members";
import { requireOrgRole } from "@/lib/api/auth";
import { clerkErrorResponse } from "@/lib/api/respond";
import { MANAGE_ROLES } from "@/lib/auth/permissions";

type RouteParams = { params: Promise<{ id: string }> };

/** `id` は Clerk の招待ID（`orginv_xxx`）。取り消しは Owner/Admin のみ許可する（§6決定）。 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await requireOrgRole(MANAGE_ROLES);
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  try {
    await revokeInvitation(ctx.orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return clerkErrorResponse(error);
  }
}

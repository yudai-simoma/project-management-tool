import { NextResponse } from "next/server";

import { revokeInvitation } from "@/lib/clerk/org-members";
import { requireOrgId } from "@/lib/api/auth";
import { clerkErrorResponse } from "@/lib/api/respond";

type RouteParams = { params: Promise<{ id: string }> };

/** `id` は Clerk の招待ID（`orginv_xxx`）。 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  try {
    await revokeInvitation(ctx.orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return clerkErrorResponse(error);
  }
}

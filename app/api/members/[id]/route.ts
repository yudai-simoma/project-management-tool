import { NextResponse } from "next/server";

import {
  isSoleOwner,
  removeMember,
  updateMemberRole,
} from "@/lib/clerk/org-members";
import { requireOrgRole } from "@/lib/api/auth";
import {
  clerkErrorResponse,
  forbiddenResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { updateMemberRoleSchema } from "@/lib/api/schemas";
import { MANAGE_ROLES } from "@/lib/auth/permissions";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * `id` は Clerk のユーザーID（`user_xxx`）。`lib/clerk/org-members.ts` 参照。
 * メンバー削除・ロール変更は Owner/Admin のみ許可する（§6決定）。
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = await requireOrgRole(MANAGE_ROLES);
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  // 組織にOwnerが1人もいなくなる降格を防ぐ（§6決定）。
  if (parsed.data.role !== "owner" && (await isSoleOwner(ctx.orgId, id))) {
    return forbiddenResponse("組織には最低1名のOwnerが必要です");
  }

  try {
    const member = await updateMemberRole(ctx.orgId, id, parsed.data.role);
    return NextResponse.json(member);
  } catch (error) {
    return clerkErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await requireOrgRole(MANAGE_ROLES);
  if (!ctx.ok) return ctx.response;

  const { id } = await params;

  // 自分自身の削除、組織にOwnerが1人もいなくなる削除を防ぐ（§6決定）。
  if (id === ctx.userId) {
    return forbiddenResponse("自分自身を組織から削除することはできません");
  }
  if (await isSoleOwner(ctx.orgId, id)) {
    return forbiddenResponse("組織には最低1名のOwnerが必要です");
  }

  try {
    await removeMember(ctx.orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return clerkErrorResponse(error);
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  inviteMember,
  listMembersForManagement,
} from "@/lib/clerk/org-members";
import { requireOrgId } from "@/lib/api/auth";
import {
  clerkErrorResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { inviteMemberSchema } from "@/lib/api/schemas";

export async function GET() {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const result = await listMembersForManagement(ctx.orgId);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    // `requireOrgId` が成功している時点で userId は必ず存在する。
    const { userId } = await auth();
    const invitation = await inviteMember(
      ctx.orgId,
      userId!,
      parsed.data.email,
      parsed.data.role,
    );
    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    return clerkErrorResponse(error);
  }
}

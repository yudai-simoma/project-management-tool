import { NextResponse } from "next/server";

import { createMember, listMembers } from "@/db/repositories/members";
import { readJsonBody, zodErrorResponse } from "@/lib/api/respond";
import { createMemberSchema } from "@/lib/api/schemas";

export async function GET() {
  const members = await listMembers();
  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const member = await createMember(parsed.data);
  return NextResponse.json(member, { status: 201 });
}

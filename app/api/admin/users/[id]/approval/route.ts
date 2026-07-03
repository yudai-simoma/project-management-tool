import { NextResponse } from "next/server";

import { isCurrentUserPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  forbiddenResponse,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/api/respond";
import { updateApprovalStatusSchema } from "@/lib/api/schemas";
import { setUserApprovalStatus } from "@/lib/clerk/platform-users";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * プラットフォーム管理者専用。ユーザーの承認状態を更新する
 * （承認・却下・利用停止＝承認済みからの却下、のいずれもこのエンドポイントで表現する）。
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  if (!(await isCurrentUserPlatformAdmin())) {
    return forbiddenResponse("プラットフォーム管理者のみアクセスできます");
  }

  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = updateApprovalStatusSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  await setUserApprovalStatus(id, parsed.data.status);
  return NextResponse.json({ id, status: parsed.data.status });
}

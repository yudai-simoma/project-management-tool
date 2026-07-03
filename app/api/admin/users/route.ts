import { NextResponse } from "next/server";

import { isCurrentUserPlatformAdmin } from "@/lib/auth/platform-admin";
import { forbiddenResponse } from "@/lib/api/respond";
import { listPlatformUsers } from "@/lib/clerk/platform-users";

/** プラットフォーム管理者専用。Clerk上の全ユーザーを承認状態付きで返す。 */
export async function GET() {
  if (!(await isCurrentUserPlatformAdmin())) {
    return forbiddenResponse("プラットフォーム管理者のみアクセスできます");
  }

  const users = await listPlatformUsers();
  return NextResponse.json({ users });
}

import { redirect } from "next/navigation";

import { isCurrentUserPlatformAdmin } from "@/lib/auth/platform-admin";

/**
 * `/admin` 配下はプラットフォーム管理者専用。`proxy.ts` は `/admin(.*)` を
 * 組織所属・承認状態を問わず素通しするため（プラットフォーム管理者は組織に
 * 所属していない・未承認の状態でも管理ページに到達できる必要があるため）、
 * 実際のアクセス制御はこのレイアウトで行う（多層防御）。
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isCurrentUserPlatformAdmin())) {
    redirect("/");
  }

  return <>{children}</>;
}

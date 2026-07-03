import { AdminApprovalDashboard } from "@/components/admin/AdminApprovalDashboard";
import { listPlatformUsers } from "@/lib/clerk/platform-users";

// Clerk上の最新のユーザー一覧を都度取得するため、静的プリレンダリング対象にしない。
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const users = await listPlatformUsers();
  return <AdminApprovalDashboard initialUsers={users} />;
}

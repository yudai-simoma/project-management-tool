/**
 * Clerk のロールキー（`org:owner` 等）と、アプリのドメイン型 `Role`
 * （`lib/schema.ts`）との相互変換。`OrgSwitcher.tsx`・`lib/clerk/org-members.ts` の
 * 双方から参照される共通ロジックのため、ここに集約する。
 */

import type { Role } from "@/lib/schema";

export function toRole(clerkRole: string | null | undefined): Role {
  const stripped = clerkRole?.replace(/^org:/, "");
  if (stripped === "owner" || stripped === "admin" || stripped === "member") {
    return stripped;
  }
  return "member";
}

export function toClerkRole(role: Role): string {
  return `org:${role}`;
}

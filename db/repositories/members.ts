/**
 * `members` テーブルへのアクセスを集約するリポジトリ層。
 *
 * 本セクション（§2）時点では `Workspace.tsx` はメンバーを読み取り専用で扱う
 * （メンバー管理UIは §4 で Clerk Organizations 経由に実装する）。CRUD 一式は
 * API として揃えておくが、`createMember`/`updateMember`/`deleteMember` は
 * 現時点ではどの画面からも呼ばれない。
 */

import { asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { members, type MemberRow } from "@/db/schema";
import type { Member, Role } from "@/lib/schema";

function toMember(row: MemberRow): Member {
  return { id: row.id, name: row.name, role: row.role };
}

export async function listMembers(): Promise<Member[]> {
  const rows = await db.select().from(members).orderBy(asc(members.createdAt));
  return rows.map(toMember);
}

export async function createMember(input: {
  id: string;
  name: string;
  role: Role;
}): Promise<Member> {
  const [row] = await db.insert(members).values(input).returning();
  return toMember(row);
}

export async function updateMember(
  id: string,
  patch: Partial<{ name: string; role: Role }>,
): Promise<Member | null> {
  const [row] = await db
    .update(members)
    .set(patch)
    .where(eq(members.id, id))
    .returning();
  return row ? toMember(row) : null;
}

export async function deleteMember(id: string): Promise<boolean> {
  const deleted = await db
    .delete(members)
    .where(eq(members.id, id))
    .returning({ id: members.id });
  return deleted.length > 0;
}

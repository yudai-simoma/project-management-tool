/**
 * Clerk Organizations API（Backend SDK）を経由した組織メンバー管理。
 *
 * セクション4（`docs/backend-implementation-plan.md`）で `data/members.json` /
 * DB の `members` テーブルを廃止し、メンバー一覧・招待・削除・ロール変更のすべてを
 * Clerk Organizations 上のデータで代替する。Route Handler からのみ呼び出す想定
 * （サーバー専用、`@clerk/nextjs/server` の `clerkClient` はブラウザから呼べない）。
 */

import { clerkClient } from "@clerk/nextjs/server";

import { toClerkRole, toRole } from "@/lib/auth/roles";
import type { Member, Role } from "@/lib/schema";

/** メンバー一覧管理UI向けの、メールアドレス付きメンバー情報。 */
export type MemberWithEmail = Member & { email: string };

/** 招待中（未承諾）の組織招待。 */
export type InvitationSummary = {
  id: string;
  email: string;
  role: Role;
};

function toMemberName(
  publicUserData:
    | { firstName: string | null; lastName: string | null; identifier: string }
    | null
    | undefined,
): string {
  const fullName = [publicUserData?.firstName, publicUserData?.lastName]
    .filter(Boolean)
    .join(" ");
  return fullName || publicUserData?.identifier || "(不明なユーザー)";
}

/**
 * タスク担当者選択（`InlineSelectField`）向けの、承諾済みメンバーのみの一覧。
 * `Member.id` には Clerk のユーザーID（`user_xxx`）を使う（membership IDは
 * メンバーの入れ直しで変わりうるため、担当者参照の安定した識別子としてユーザーIDを使う）。
 */
export async function listActiveMembers(orgId: string): Promise<Member[]> {
  const client = await clerkClient();
  const { data } = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 500,
  });

  return data
    .filter((m) => m.publicUserData?.userId)
    .map((m) => ({
      id: m.publicUserData!.userId,
      name: toMemberName(m.publicUserData),
      role: toRole(m.role),
    }));
}

/** メンバー管理ダイアログ向け。承諾済みメンバー（メール付き）と招待中の一覧をまとめて返す。 */
export async function listMembersForManagement(orgId: string): Promise<{
  members: MemberWithEmail[];
  invitations: InvitationSummary[];
}> {
  const client = await clerkClient();

  const [membershipList, invitationList] = await Promise.all([
    client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 500,
    }),
    client.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
      limit: 500,
    }),
  ]);

  const members: MemberWithEmail[] = membershipList.data
    .filter((m) => m.publicUserData?.userId)
    .map((m) => ({
      id: m.publicUserData!.userId,
      name: toMemberName(m.publicUserData),
      email: m.publicUserData!.identifier,
      role: toRole(m.role),
    }));

  const invitations: InvitationSummary[] = invitationList.data.map((inv) => ({
    id: inv.id,
    email: inv.emailAddress,
    role: toRole(inv.role),
  }));

  return { members, invitations };
}

export async function inviteMember(
  orgId: string,
  inviterUserId: string,
  email: string,
  role: Role,
): Promise<InvitationSummary> {
  const client = await clerkClient();
  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    emailAddress: email,
    role: toClerkRole(role),
    inviterUserId,
  });
  return { id: invitation.id, email: invitation.emailAddress, role };
}

export async function updateMemberRole(
  orgId: string,
  userId: string,
  role: Role,
): Promise<Member> {
  const client = await clerkClient();
  const membership = await client.organizations.updateOrganizationMembership({
    organizationId: orgId,
    userId,
    role: toClerkRole(role),
  });
  return {
    id: userId,
    name: toMemberName(membership.publicUserData),
    role: toRole(membership.role),
  };
}

export async function removeMember(
  orgId: string,
  userId: string,
): Promise<void> {
  const client = await clerkClient();
  await client.organizations.deleteOrganizationMembership({
    organizationId: orgId,
    userId,
  });
}

export async function revokeInvitation(
  orgId: string,
  invitationId: string,
): Promise<void> {
  const client = await clerkClient();
  await client.organizations.revokeOrganizationInvitation({
    organizationId: orgId,
    invitationId,
  });
}

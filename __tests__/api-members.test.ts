import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `app/api/members/**` の Route Handler ユニットテスト。
 *
 * `lib/clerk/org-members`（Clerk Organizations API 呼び出し）と `@clerk/nextjs/server`
 * の `auth` をモックし、実Clerk接続なしでバリデーション・レスポンス整形・
 * エラーハンドリングを検証する（`docs/backend-implementation-plan.md` セクション4）。
 */
vi.mock("@/lib/clerk/org-members", () => ({
  listMembersForManagement: vi.fn(),
  inviteMember: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  revokeInvitation: vi.fn(),
}));
vi.mock("@/lib/api/auth", () => ({
  requireOrgId: vi.fn(async () => ({ ok: true, orgId: "org_test" })),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user_admin", orgId: "org_test" })),
}));

import { ClerkAPIResponseError } from "@clerk/nextjs/errors";

import * as orgMembers from "@/lib/clerk/org-members";
import { GET, POST } from "@/app/api/members/route";
import { DELETE, PATCH } from "@/app/api/members/[id]/route";
import { DELETE as DELETE_INVITATION } from "@/app/api/members/invitations/[id]/route";

const asMock = <T extends (...args: never[]) => unknown>(fn: T) =>
  vi.mocked(fn);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/members", () => {
  it("メンバー一覧と招待中一覧をそのまま返す", async () => {
    asMock(orgMembers.listMembersForManagement).mockResolvedValue({
      members: [
        {
          id: "user_1",
          name: "佐藤 健太",
          email: "sato@example.com",
          role: "owner",
        },
      ],
      invitations: [
        { id: "orginv_1", email: "new@example.com", role: "member" },
      ],
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      members: [
        {
          id: "user_1",
          name: "佐藤 健太",
          email: "sato@example.com",
          role: "owner",
        },
      ],
      invitations: [
        { id: "orginv_1", email: "new@example.com", role: "member" },
      ],
    });
  });
});

describe("POST /api/members", () => {
  it("正常なボディで招待を作成し201を返す", async () => {
    asMock(orgMembers.inviteMember).mockResolvedValue({
      id: "orginv_1",
      email: "new@example.com",
      role: "member",
    });

    const res = await POST(
      new Request("http://localhost/api/members", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "member" }),
      }),
    );

    expect(res.status).toBe(201);
    expect(orgMembers.inviteMember).toHaveBeenCalledWith(
      "org_test",
      "user_admin",
      "new@example.com",
      "member",
    );
  });

  it("email が不正な値だと400を返す", async () => {
    const res = await POST(
      new Request("http://localhost/api/members", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email", role: "member" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(orgMembers.inviteMember).not.toHaveBeenCalled();
  });

  it("role が不正な値だと400を返す", async () => {
    const res = await POST(
      new Request("http://localhost/api/members", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "ceo" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(orgMembers.inviteMember).not.toHaveBeenCalled();
  });

  it("Clerk側のエラー（重複招待等）は Clerk の status/message で返す", async () => {
    const clerkError = new ClerkAPIResponseError("already invited", {
      status: 422,
      data: [{ code: "duplicate", message: "既に招待済みです" }],
    });
    asMock(orgMembers.inviteMember).mockRejectedValue(clerkError);

    const res = await POST(
      new Request("http://localhost/api/members", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "member" }),
      }),
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "既に招待済みです" });
  });
});

describe("PATCH /api/members/[id]", () => {
  it("ロールを変更する", async () => {
    asMock(orgMembers.updateMemberRole).mockResolvedValue({
      id: "user_1",
      name: "佐藤 健太",
      role: "admin",
    });

    const res = await PATCH(
      new Request("http://localhost/api/members/user_1", {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      }),
      { params: Promise.resolve({ id: "user_1" }) },
    );

    expect(res.status).toBe(200);
    expect(orgMembers.updateMemberRole).toHaveBeenCalledWith(
      "org_test",
      "user_1",
      "admin",
    );
    expect(await res.json()).toEqual({
      id: "user_1",
      name: "佐藤 健太",
      role: "admin",
    });
  });

  it("role が指定されていなければ400を返す", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/members/user_1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "user_1" }) },
    );

    expect(res.status).toBe(400);
    expect(orgMembers.updateMemberRole).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/members/[id]", () => {
  it("メンバーを削除し204を返す", async () => {
    asMock(orgMembers.removeMember).mockResolvedValue(undefined);

    const res = await DELETE(
      new Request("http://localhost/api/members/user_1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "user_1" }) },
    );

    expect(res.status).toBe(204);
    expect(orgMembers.removeMember).toHaveBeenCalledWith("org_test", "user_1");
  });
});

describe("DELETE /api/members/invitations/[id]", () => {
  it("招待を取り消し204を返す", async () => {
    asMock(orgMembers.revokeInvitation).mockResolvedValue(undefined);

    const res = await DELETE_INVITATION(
      new Request("http://localhost/api/members/invitations/orginv_1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "orginv_1" }) },
    );

    expect(res.status).toBe(204);
    expect(orgMembers.revokeInvitation).toHaveBeenCalledWith(
      "org_test",
      "orginv_1",
    );
  });
});

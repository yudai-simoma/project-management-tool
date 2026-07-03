import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `app/api/admin/users/**` の Route Handler ユニットテスト。
 * `lib/auth/platform-admin`（管理者判定）と `lib/clerk/platform-users`
 * （Clerk Backend SDK 呼び出し）をモックし、実Clerk接続なしで検証する
 * （`docs/feedback-implementation-plan.md` ステップ1）。
 */
vi.mock("@/lib/auth/platform-admin", () => ({
  isCurrentUserPlatformAdmin: vi.fn(),
}));
vi.mock("@/lib/clerk/platform-users", () => ({
  listPlatformUsers: vi.fn(),
  setUserApprovalStatus: vi.fn(),
}));

import { isCurrentUserPlatformAdmin } from "@/lib/auth/platform-admin";
import * as platformUsers from "@/lib/clerk/platform-users";
import { GET } from "@/app/api/admin/users/route";
import { PATCH } from "@/app/api/admin/users/[id]/approval/route";

const asMock = <T extends (...args: never[]) => unknown>(fn: T) =>
  vi.mocked(fn);

beforeEach(() => {
  vi.clearAllMocks();
});

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/admin/users/user_1/approval", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/users", () => {
  it("プラットフォーム管理者でなければ403を返す", async () => {
    asMock(isCurrentUserPlatformAdmin).mockResolvedValue(false);

    const res = await GET();

    expect(res.status).toBe(403);
    expect(asMock(platformUsers.listPlatformUsers)).not.toHaveBeenCalled();
  });

  it("プラットフォーム管理者なら全ユーザー一覧を返す", async () => {
    asMock(isCurrentUserPlatformAdmin).mockResolvedValue(true);
    asMock(platformUsers.listPlatformUsers).mockResolvedValue([
      {
        id: "user_1",
        name: "山田 太郎",
        email: "yamada@example.com",
        approvalStatus: "pending",
        createdAt: 0,
      },
    ]);

    const res = await GET();
    const body = (await res.json()) as { users: unknown[] };

    expect(res.status).toBe(200);
    expect(body.users).toHaveLength(1);
  });
});

describe("PATCH /api/admin/users/[id]/approval", () => {
  it("プラットフォーム管理者でなければ403を返す", async () => {
    asMock(isCurrentUserPlatformAdmin).mockResolvedValue(false);

    const res = await PATCH(patchRequest({ status: "approved" }), {
      params: Promise.resolve({ id: "user_1" }),
    });

    expect(res.status).toBe(403);
    expect(
      asMock(platformUsers.setUserApprovalStatus),
    ).not.toHaveBeenCalled();
  });

  it("不正な status は400を返す", async () => {
    asMock(isCurrentUserPlatformAdmin).mockResolvedValue(true);

    const res = await PATCH(patchRequest({ status: "pending" }), {
      params: Promise.resolve({ id: "user_1" }),
    });

    expect(res.status).toBe(400);
  });

  it("approved を指定すると承認状態を更新する", async () => {
    asMock(isCurrentUserPlatformAdmin).mockResolvedValue(true);

    const res = await PATCH(patchRequest({ status: "approved" }), {
      params: Promise.resolve({ id: "user_1" }),
    });
    const body = (await res.json()) as { id: string; status: string };

    expect(res.status).toBe(200);
    expect(body).toEqual({ id: "user_1", status: "approved" });
    expect(asMock(platformUsers.setUserApprovalStatus)).toHaveBeenCalledWith(
      "user_1",
      "approved",
    );
  });

  it("rejected を指定すると承認状態を更新する（利用停止・却下の両方で使う）", async () => {
    asMock(isCurrentUserPlatformAdmin).mockResolvedValue(true);

    const res = await PATCH(patchRequest({ status: "rejected" }), {
      params: Promise.resolve({ id: "user_1" }),
    });

    expect(res.status).toBe(200);
    expect(asMock(platformUsers.setUserApprovalStatus)).toHaveBeenCalledWith(
      "user_1",
      "rejected",
    );
  });
});

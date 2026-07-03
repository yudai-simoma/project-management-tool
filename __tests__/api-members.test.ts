import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/repositories/members", () => ({
  listMembers: vi.fn(),
  createMember: vi.fn(),
  updateMember: vi.fn(),
  deleteMember: vi.fn(),
}));

import * as membersRepo from "@/db/repositories/members";
import { GET, POST } from "@/app/api/members/route";
import { DELETE, PATCH } from "@/app/api/members/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/members", () => {
  it("メンバー一覧をそのまま返す", async () => {
    vi.mocked(membersRepo.listMembers).mockResolvedValue([
      { id: "m-1", name: "佐藤 健太", role: "owner" },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: "m-1", name: "佐藤 健太", role: "owner" },
    ]);
  });
});

describe("POST /api/members", () => {
  it("正常なボディでメンバーを作成し201を返す", async () => {
    vi.mocked(membersRepo.createMember).mockResolvedValue({
      id: "m-1",
      name: "佐藤 健太",
      role: "member",
    });

    const res = await POST(
      new Request("http://localhost/api/members", {
        method: "POST",
        body: JSON.stringify({ id: "m-1", name: "佐藤 健太", role: "member" }),
      }),
    );

    expect(res.status).toBe(201);
  });

  it("role が不正な値だと400を返す", async () => {
    const res = await POST(
      new Request("http://localhost/api/members", {
        method: "POST",
        body: JSON.stringify({ id: "m-1", name: "佐藤 健太", role: "ceo" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(membersRepo.createMember).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/members/[id]", () => {
  it("空のボディは400（更新項目なしエラー）を返す", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/members/m-1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "m-1" }) },
    );

    expect(res.status).toBe(400);
    expect(membersRepo.updateMember).not.toHaveBeenCalled();
  });

  it("存在しないメンバーは404を返す", async () => {
    vi.mocked(membersRepo.updateMember).mockResolvedValue(null);

    const res = await PATCH(
      new Request("http://localhost/api/members/none", {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      }),
      { params: Promise.resolve({ id: "none" }) },
    );

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/members/[id]", () => {
  it("メンバーを削除し204を返す", async () => {
    vi.mocked(membersRepo.deleteMember).mockResolvedValue(true);

    const res = await DELETE(
      new Request("http://localhost/api/members/m-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "m-1" }) },
    );

    expect(res.status).toBe(204);
  });
});

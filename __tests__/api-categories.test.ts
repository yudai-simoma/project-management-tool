import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `app/api/categories/**` の Route Handler ユニットテスト。
 *
 * リポジトリ層（`db/repositories/categories`）を丸ごとモックすることで、実DB接続
 * なしに Route Handler 自体のバリデーション・レスポンス整形ロジックを検証する
 * （`docs/backend-implementation-plan.md` セクション2のテスト方針）。
 */
vi.mock("@/db/repositories/categories", () => ({
  listCategories: vi.fn(),
}));
vi.mock("@/lib/api/auth", () => ({
  requireOrgId: vi.fn(async () => ({
    ok: true,
    orgId: "org_test",
    userId: "user_owner",
    role: "owner",
  })),
}));

import * as categoriesRepo from "@/db/repositories/categories";
import { GET, POST } from "@/app/api/categories/route";
import { DELETE, PATCH } from "@/app/api/categories/[id]/route";

const asMock = <T extends (...args: never[]) => unknown>(fn: T) =>
  vi.mocked(fn);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/categories", () => {
  it("カテゴリ一覧をそのまま返す", async () => {
    asMock(categoriesRepo.listCategories).mockResolvedValue([
      { id: "cat-1", name: "プロダクト開発" },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "cat-1", name: "プロダクト開発" }]);
  });
});

describe("POST /api/categories", () => {
  it("カテゴリ廃止後は410を返す", async () => {
    const res = await POST(
      new Request("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({ id: "cat-1", name: "プロダクト開発" }),
      }),
    );

    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ error: "カテゴリは廃止されました" });
  });
});

describe("PATCH /api/categories/[id]", () => {
  it("カテゴリ廃止後は410を返す", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/categories/cat-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "新名称" }),
      }),
      { params: Promise.resolve({ id: "cat-1" }) },
    );

    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ error: "カテゴリは廃止されました" });
  });
});

describe("DELETE /api/categories/[id]", () => {
  it("カテゴリ廃止後は410を返す", async () => {
    const res = await DELETE(
      new Request("http://localhost/api/categories/cat-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "cat-1" }) },
    );

    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ error: "カテゴリは廃止されました" });
  });
});

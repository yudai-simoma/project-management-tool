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
  createCategory: vi.fn(),
  updateCategoryName: vi.fn(),
  deleteCategoryCascade: vi.fn(),
}));
vi.mock("@/lib/api/auth", () => ({
  requireOrgId: vi.fn(async () => ({
    ok: true,
    orgId: "org_test",
    userId: "user_owner",
    role: "owner",
  })),
  requireOrgRole: vi.fn(async () => ({
    ok: true,
    orgId: "org_test",
    userId: "user_owner",
    role: "owner",
  })),
}));

import { NextResponse } from "next/server";

import * as categoriesRepo from "@/db/repositories/categories";
import { requireOrgRole } from "@/lib/api/auth";
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
  it("正常なボディでカテゴリを作成し201を返す", async () => {
    asMock(categoriesRepo.createCategory).mockResolvedValue({
      id: "cat-1",
      name: "プロダクト開発",
    });

    const res = await POST(
      new Request("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({ id: "cat-1", name: "プロダクト開発" }),
      }),
    );

    expect(res.status).toBe(201);
    expect(categoriesRepo.createCategory).toHaveBeenCalledWith("org_test", {
      id: "cat-1",
      name: "プロダクト開発",
    });
    expect(await res.json()).toEqual({ id: "cat-1", name: "プロダクト開発" });
  });

  it("name が空文字だと400を返し、リポジトリは呼ばれない", async () => {
    const res = await POST(
      new Request("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({ id: "cat-1", name: "" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(categoriesRepo.createCategory).not.toHaveBeenCalled();
  });

  it("JSONとして壊れたボディでも400を返す", async () => {
    const res = await POST(
      new Request("http://localhost/api/categories", {
        method: "POST",
        body: "{not-json",
      }),
    );

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/categories/[id]", () => {
  it("カテゴリ名を更新する", async () => {
    asMock(categoriesRepo.updateCategoryName).mockResolvedValue({
      id: "cat-1",
      name: "新名称",
    });

    const res = await PATCH(
      new Request("http://localhost/api/categories/cat-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "新名称" }),
      }),
      { params: Promise.resolve({ id: "cat-1" }) },
    );

    expect(res.status).toBe(200);
    expect(categoriesRepo.updateCategoryName).toHaveBeenCalledWith(
      "org_test",
      "cat-1",
      "新名称",
    );
  });

  it("存在しないカテゴリは404を返す", async () => {
    asMock(categoriesRepo.updateCategoryName).mockResolvedValue(null);

    const res = await PATCH(
      new Request("http://localhost/api/categories/none", {
        method: "PATCH",
        body: JSON.stringify({ name: "新名称" }),
      }),
      { params: Promise.resolve({ id: "none" }) },
    );

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/categories/[id]", () => {
  it("配下プロジェクトごと連鎖削除し204を返す", async () => {
    asMock(categoriesRepo.deleteCategoryCascade).mockResolvedValue(true);

    const res = await DELETE(
      new Request("http://localhost/api/categories/cat-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "cat-1" }) },
    );

    expect(res.status).toBe(204);
    expect(categoriesRepo.deleteCategoryCascade).toHaveBeenCalledWith(
      "org_test",
      "cat-1",
    );
  });

  it("存在しないカテゴリは404を返す", async () => {
    asMock(categoriesRepo.deleteCategoryCascade).mockResolvedValue(false);

    const res = await DELETE(
      new Request("http://localhost/api/categories/none", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "none" }) },
    );

    expect(res.status).toBe(404);
  });

  it("Owner/Admin以外は403を返す（§6ロール制限）", async () => {
    asMock(requireOrgRole).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "権限がありません" }, { status: 403 }),
    } as never);

    const res = await DELETE(
      new Request("http://localhost/api/categories/cat-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "cat-1" }) },
    );

    expect(res.status).toBe(403);
    expect(categoriesRepo.deleteCategoryCascade).not.toHaveBeenCalled();
  });
});

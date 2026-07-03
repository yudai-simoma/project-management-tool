import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCategoryApi,
  deleteTaskApi,
  updateTaskApi,
} from "@/lib/api/workspace-client";

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("workspace-client (fetch wrapper)", () => {
  it("成功時はレスポンスのJSONを返す", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "cat-1", name: "A" }), {
        status: 201,
      }),
    );

    const result = await createCategoryApi({ id: "cat-1", name: "A" });

    expect(result).toEqual({ id: "cat-1", name: "A" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/categories",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("204レスポンスはundefinedを返す", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    const result = await deleteTaskApi("t-1");

    expect(result).toBeUndefined();
  });

  it("non-OKレスポンスはサーバーのerrorメッセージでthrowする", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "タスクが見つかりません" }), {
        status: 404,
      }),
    );

    await expect(updateTaskApi("t-1", { done: true })).rejects.toThrow(
      "タスクが見つかりません",
    );
  });

  it("エラーボディが無い場合もステータス付きの汎用メッセージでthrowする", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    await expect(updateTaskApi("t-1", { done: true })).rejects.toThrow(/500/);
  });
});

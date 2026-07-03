import { describe, expect, it, vi } from "vitest";

/**
 * `app/admin/layout.tsx` のユニットテスト。
 * `proxy.ts` は `/admin(.*)` を組織所属・承認状態を問わず素通しするため、実際の
 * アクセス制御（プラットフォーム管理者以外を弾く）はこのレイアウトが担う。
 * `next/navigation` の `redirect()` は特殊な例外を投げる（`digest` にリダイレクト先を
 * 含む）ため、`__tests__/page.test.tsx` と同じパターンで検証する。
 */
vi.mock("@/lib/auth/platform-admin", () => ({
  isCurrentUserPlatformAdmin: vi.fn(),
}));

import { isCurrentUserPlatformAdmin } from "@/lib/auth/platform-admin";
import AdminLayout from "@/app/admin/layout";

describe("AdminLayout", () => {
  it("プラットフォーム管理者でなければ / へリダイレクトする", async () => {
    vi.mocked(isCurrentUserPlatformAdmin).mockResolvedValue(false);

    await expect(
      AdminLayout({ children: <div>管理ページ</div> }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/"),
    });
  });

  it("プラットフォーム管理者なら children をそのまま表示する", async () => {
    vi.mocked(isCurrentUserPlatformAdmin).mockResolvedValue(true);

    const result = await AdminLayout({ children: <div>管理ページ</div> });

    expect(result).toEqual(<>{<div>管理ページ</div>}</>);
  });
});

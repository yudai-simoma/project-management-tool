import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { requireOrgId, requireOrgRole } from "@/lib/api/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireOrgId", () => {
  it("userId・orgId・role が揃っていれば返す（orgRole は Clerk の `org:owner` 形式）", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:owner",
    } as never);

    const ctx = await requireOrgId();

    expect(ctx.ok).toBe(true);
    if (!ctx.ok) throw new Error("unreachable");
    expect(ctx.orgId).toBe("org_1");
    expect(ctx.userId).toBe("user_1");
    expect(ctx.role).toBe("owner");
  });

  it("orgRole が無い/不明な形式の場合は role を member として扱う", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: null,
    } as never);

    const ctx = await requireOrgId();

    expect(ctx.ok).toBe(true);
    if (!ctx.ok) throw new Error("unreachable");
    expect(ctx.role).toBe("member");
  });

  it("未サインイン（userId が無い）は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: null,
      orgId: null,
    } as never);

    const ctx = await requireOrgId();

    expect(ctx.ok).toBe(false);
    if (ctx.ok) throw new Error("unreachable");
    expect(ctx.response.status).toBe(401);
  });

  it("サインイン済みだが組織未所属は403を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_1",
      orgId: null,
    } as never);

    const ctx = await requireOrgId();

    expect(ctx.ok).toBe(false);
    if (ctx.ok) throw new Error("unreachable");
    expect(ctx.response.status).toBe(403);
  });
});

describe("requireOrgRole", () => {
  it("許可されたロールならコンテキストを返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    } as never);

    const ctx = await requireOrgRole(["owner", "admin"]);

    expect(ctx.ok).toBe(true);
    if (!ctx.ok) throw new Error("unreachable");
    expect(ctx.role).toBe("admin");
  });

  it("許可されていないロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    } as never);

    const ctx = await requireOrgRole(["owner", "admin"]);

    expect(ctx.ok).toBe(false);
    if (ctx.ok) throw new Error("unreachable");
    expect(ctx.response.status).toBe(403);
  });

  it("未サインインは401を返す（ロール判定より先に認証を確認する）", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: null,
      orgId: null,
    } as never);

    const ctx = await requireOrgRole(["owner", "admin"]);

    expect(ctx.ok).toBe(false);
    if (ctx.ok) throw new Error("unreachable");
    expect(ctx.response.status).toBe(401);
  });
});

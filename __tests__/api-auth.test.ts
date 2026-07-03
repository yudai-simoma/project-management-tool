import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { requireOrgId } from "@/lib/api/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireOrgId", () => {
  it("userId・orgId が揃っていれば orgId を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
    } as never);

    const ctx = await requireOrgId();

    expect(ctx.ok).toBe(true);
    if (!ctx.ok) throw new Error("unreachable");
    expect(ctx.orgId).toBe("org_1");
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

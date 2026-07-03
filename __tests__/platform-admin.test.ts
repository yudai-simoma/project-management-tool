import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

import { currentUser } from "@clerk/nextjs/server";
import {
  isCurrentUserPlatformAdmin,
  isPlatformAdminEmail,
} from "@/lib/auth/platform-admin";

const ORIGINAL_ENV = process.env.PLATFORM_ADMIN_EMAILS;

afterEach(() => {
  process.env.PLATFORM_ADMIN_EMAILS = ORIGINAL_ENV;
  vi.clearAllMocks();
});

describe("isPlatformAdminEmail", () => {
  it("PLATFORM_ADMIN_EMAILS に列挙されたメールアドレスなら true", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "a@example.com,b@example.com";
    expect(isPlatformAdminEmail("a@example.com")).toBe(true);
    expect(isPlatformAdminEmail("b@example.com")).toBe(true);
  });

  it("列挙されていないメールアドレスは false", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "a@example.com";
    expect(isPlatformAdminEmail("c@example.com")).toBe(false);
  });

  it("大文字小文字・前後の空白を無視して一致判定する", () => {
    process.env.PLATFORM_ADMIN_EMAILS = " A@Example.com , b@example.com ";
    expect(isPlatformAdminEmail("a@example.com")).toBe(true);
    expect(isPlatformAdminEmail("A@EXAMPLE.COM")).toBe(true);
  });

  it("PLATFORM_ADMIN_EMAILS が未設定なら常に false", () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    expect(isPlatformAdminEmail("a@example.com")).toBe(false);
  });

  it("email が null/undefined/空文字なら false", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "a@example.com";
    expect(isPlatformAdminEmail(null)).toBe(false);
    expect(isPlatformAdminEmail(undefined)).toBe(false);
    expect(isPlatformAdminEmail("")).toBe(false);
  });
});

describe("isCurrentUserPlatformAdmin", () => {
  beforeEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com";
  });

  it("現在のユーザーの primaryEmailAddress が一致すれば true", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      primaryEmailAddress: { emailAddress: "admin@example.com" },
      emailAddresses: [],
    } as never);

    expect(await isCurrentUserPlatformAdmin()).toBe(true);
  });

  it("primaryEmailAddress が無い場合は emailAddresses[0] にフォールバックする", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      primaryEmailAddress: null,
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    } as never);

    expect(await isCurrentUserPlatformAdmin()).toBe(true);
  });

  it("一致しなければ false", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      primaryEmailAddress: { emailAddress: "member@example.com" },
      emailAddresses: [],
    } as never);

    expect(await isCurrentUserPlatformAdmin()).toBe(false);
  });

  it("未サインイン（currentUser が null）なら false", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);
    expect(await isCurrentUserPlatformAdmin()).toBe(false);
  });
});

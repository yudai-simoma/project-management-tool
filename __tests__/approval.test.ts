import { afterEach, describe, expect, it } from "vitest";

import { getApprovalStatus, isApprovalRequired } from "@/lib/auth/approval";

const ORIGINAL_APPROVAL_REQUIRED = process.env.APPROVAL_REQUIRED;

afterEach(() => {
  process.env.APPROVAL_REQUIRED = ORIGINAL_APPROVAL_REQUIRED;
});

describe("getApprovalStatus", () => {
  it("publicMetadata が未設定（null/undefined）なら pending", () => {
    expect(getApprovalStatus(null)).toBe("pending");
    expect(getApprovalStatus(undefined)).toBe("pending");
  });

  it("approvalStatus フィールドが無いオブジェクトなら pending", () => {
    expect(getApprovalStatus({})).toBe("pending");
  });

  it("approvalStatus が approved なら approved", () => {
    expect(getApprovalStatus({ approvalStatus: "approved" })).toBe("approved");
  });

  it("approvalStatus が rejected なら rejected", () => {
    expect(getApprovalStatus({ approvalStatus: "rejected" })).toBe("rejected");
  });

  it("approvalStatus が想定外の値なら pending として扱う（安全側に倒す）", () => {
    expect(getApprovalStatus({ approvalStatus: "unknown-value" })).toBe(
      "pending",
    );
    expect(getApprovalStatus({ approvalStatus: 123 })).toBe("pending");
  });
});

describe("isApprovalRequired", () => {
  it("未設定なら承認必須", () => {
    delete process.env.APPROVAL_REQUIRED;
    expect(isApprovalRequired()).toBe(true);
  });

  it("false/0/off/no は承認ゲートを無効にする", () => {
    expect(isApprovalRequired("false")).toBe(false);
    expect(isApprovalRequired("0")).toBe(false);
    expect(isApprovalRequired("off")).toBe(false);
    expect(isApprovalRequired("no")).toBe(false);
  });

  it("それ以外の値は承認必須として扱う", () => {
    expect(isApprovalRequired("true")).toBe(true);
    expect(isApprovalRequired("yes")).toBe(true);
    expect(isApprovalRequired("unexpected")).toBe(true);
  });
});

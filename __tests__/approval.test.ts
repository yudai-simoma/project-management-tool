import { describe, expect, it } from "vitest";

import { getApprovalStatus } from "@/lib/auth/approval";

describe("getApprovalStatus", () => {
  it("publicMetadata が未設定（null/undefined）なら pending", () => {
    expect(getApprovalStatus(null)).toBe("pending");
    expect(getApprovalStatus(undefined)).toBe("pending");
  });

  it("approvalStatus フィールドが無いオブジェクトなら pending", () => {
    expect(getApprovalStatus({})).toBe("pending");
  });

  it("approvalStatus が approved なら approved", () => {
    expect(getApprovalStatus({ approvalStatus: "approved" })).toBe(
      "approved",
    );
  });

  it("approvalStatus が rejected なら rejected", () => {
    expect(getApprovalStatus({ approvalStatus: "rejected" })).toBe(
      "rejected",
    );
  });

  it("approvalStatus が想定外の値なら pending として扱う（安全側に倒す）", () => {
    expect(getApprovalStatus({ approvalStatus: "unknown-value" })).toBe(
      "pending",
    );
    expect(getApprovalStatus({ approvalStatus: 123 })).toBe("pending");
  });
});

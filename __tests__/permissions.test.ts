import { describe, expect, it } from "vitest";

import {
  canDeleteTask,
  canManageOrg,
  isOnlyOwner,
} from "@/lib/auth/permissions";

describe("canManageOrg", () => {
  it("owner は true", () => {
    expect(canManageOrg("owner")).toBe(true);
  });

  it("admin は true", () => {
    expect(canManageOrg("admin")).toBe(true);
  });

  it("member は false", () => {
    expect(canManageOrg("member")).toBe(false);
  });
});

describe("canDeleteTask", () => {
  it("canManage=true ならどのタスクでも削除できる（Owner/Admin相当）", () => {
    expect(canDeleteTask(true, "user_owner", "user_other")).toBe(true);
  });

  it("canManage=false でも自分が担当者のタスクは削除できる", () => {
    expect(canDeleteTask(false, "user_1", "user_1")).toBe(true);
  });

  it("canManage=false かつ他人が担当者のタスクは削除できない", () => {
    expect(canDeleteTask(false, "user_1", "user_2")).toBe(false);
  });

  it("canManage=false かつ未アサインのタスクは削除できない", () => {
    expect(canDeleteTask(false, "user_1", "")).toBe(false);
  });
});

describe("isOnlyOwner", () => {
  it("Ownerが1人だけで、それが対象ユーザーなら true", () => {
    const members = [
      { id: "user_1", role: "owner" as const },
      { id: "user_2", role: "member" as const },
    ];
    expect(isOnlyOwner(members, "user_1")).toBe(true);
  });

  it("Ownerが1人だけでも、対象ユーザーが別人なら false", () => {
    const members = [
      { id: "user_1", role: "owner" as const },
      { id: "user_2", role: "member" as const },
    ];
    expect(isOnlyOwner(members, "user_2")).toBe(false);
  });

  it("Ownerが複数いれば false", () => {
    const members = [
      { id: "user_1", role: "owner" as const },
      { id: "user_2", role: "owner" as const },
    ];
    expect(isOnlyOwner(members, "user_1")).toBe(false);
  });

  it("Ownerが1人もいなければ false", () => {
    const members = [{ id: "user_1", role: "admin" as const }];
    expect(isOnlyOwner(members, "user_1")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";

import { formatISODate, parseISODate } from "@/lib/utils";

describe("parseISODate", () => {
  it("空文字は undefined", () => {
    expect(parseISODate("")).toBeUndefined();
  });

  it("不正フォーマットは undefined", () => {
    expect(parseISODate("not-a-date")).toBeUndefined();
  });

  it("ローカル 0 時で返す（タイムゾーン跨ぎを避ける）", () => {
    const d = parseISODate("2026-07-03");
    expect(d).toBeDefined();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(6);
    expect(d?.getDate()).toBe(3);
    expect(d?.getHours()).toBe(0);
  });
});

describe("formatISODate", () => {
  it("undefined は空文字", () => {
    expect(formatISODate(undefined)).toBe("");
  });

  it("不正な Date は空文字", () => {
    expect(formatISODate(new Date("invalid"))).toBe("");
  });

  it("YYYY-MM-DD にゼロ埋めで整形", () => {
    expect(formatISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatISODate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

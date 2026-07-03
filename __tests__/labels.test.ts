import { describe, it, expect } from "vitest";

import { buildAiTaskProposalTitles } from "@/lib/labels";

describe("buildAiTaskProposalTitles", () => {
  it("トピック未指定なら固定の候補タイトルをそのまま返す", () => {
    const titles = buildAiTaskProposalTitles();
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.every((t) => typeof t === "string" && t.length > 0)).toBe(
      true,
    );
  });

  it("トピックを指定すると各タイトルにプレフィックスする", () => {
    const withoutTopic = buildAiTaskProposalTitles();
    const withTopic = buildAiTaskProposalTitles("リリース準備");
    expect(withTopic.length).toBe(withoutTopic.length);
    withTopic.forEach((title, i) => {
      expect(title).toBe(`リリース準備: ${withoutTopic[i]}`);
    });
  });

  it("空白のみのトピックは未指定として扱う", () => {
    expect(buildAiTaskProposalTitles("   ")).toEqual(
      buildAiTaskProposalTitles(),
    );
  });
});

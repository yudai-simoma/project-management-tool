import { describe, expect, it } from "vitest";

import { formatProjectContext } from "@/lib/ai/context";
import type { Member, Project } from "@/lib/schema";

const project: Project = {
  id: "p-1",
  name: "モバイルアプリ新機能開発",
  categoryId: "cat-1",
  status: "inProgress",
  deadline: "2026-08-01",
  tasks: [
    {
      id: "t-1",
      title: "要件定義",
      done: true,
      dueDate: "2026-07-10",
      assigneeId: "m-1",
      memo: "初回MTG済み",
    },
    {
      id: "t-2",
      title: "設計",
      done: false,
      dueDate: "",
      assigneeId: "",
      memo: "",
    },
  ],
};

const members: Member[] = [{ id: "m-1", name: "佐藤 健太", role: "owner" }];

describe("formatProjectContext", () => {
  it("プロジェクト・タスク・メンバー情報をAIに渡すテキストへ整形する", () => {
    const text = formatProjectContext(project, members, "プロダクト開発");

    expect(text).toContain("モバイルアプリ新機能開発");
    expect(text).toContain("プロダクト開発");
    expect(text).toContain("id=t-1");
    expect(text).toContain("佐藤 健太");
    expect(text).toContain("id=m-1");
  });

  it("タスク・メンバーが0件でも例外を投げない", () => {
    const empty: Project = { ...project, tasks: [] };
    const text = formatProjectContext(empty, [], "");
    expect(text).toContain("(タスクなし)");
    expect(text).toContain("(登録メンバーなし)");
  });
});

import { describe, expect, it } from "vitest";

import { buildSeedRows } from "@/db/seed-data";
import type { Category, Member, Project } from "@/lib/schema";

const categories: Category[] = [
  { id: "cat1", name: "プロダクト開発" },
  { id: "cat2", name: "社内システム" },
];

const members: Member[] = [
  { id: "m1", name: "佐藤 健太", role: "owner" },
  { id: "m2", name: "鈴木 美咲", role: "member" },
];

const projects: Project[] = [
  {
    id: "pr1",
    name: "モバイルアプリ新機能開発",
    categoryId: "cat1",
    status: "inProgress",
    deadline: "2026-07-05",
    tasks: [
      {
        id: "t1-1",
        title: "要件定義",
        done: true,
        dueDate: "2026-06-20",
        assigneeId: "m1",
        memo: "",
      },
      {
        id: "t1-2",
        title: "実装",
        done: false,
        dueDate: "",
        assigneeId: "",
        memo: "",
      },
    ],
  },
  {
    id: "pr2",
    name: "オフィス移転プロジェクト",
    categoryId: "cat2",
    status: "planning",
    deadline: "",
    tasks: [],
  },
];

const orgId = "org_test";

describe("buildSeedRows", () => {
  it("categories に orgId を付与して insert 行に変換し、members は orgId を持たずそのまま変換する", () => {
    const { categoryRows, memberRows } = buildSeedRows(
      categories,
      members,
      projects,
      orgId,
    );
    expect(categoryRows).toEqual(categories.map((c) => ({ ...c, orgId })));
    expect(memberRows).toEqual(members);
  });

  it("projects の配列順を sortOrder として採番し、orgId を付与し、tasks を持たない", () => {
    const { projectRows } = buildSeedRows(categories, members, projects, orgId);
    expect(projectRows).toEqual([
      {
        id: "pr1",
        name: "モバイルアプリ新機能開発",
        categoryId: "cat1",
        status: "inProgress",
        deadline: "2026-07-05",
        sortOrder: 0,
        orgId,
      },
      {
        id: "pr2",
        name: "オフィス移転プロジェクト",
        categoryId: "cat2",
        status: "planning",
        deadline: "",
        sortOrder: 1,
        orgId,
      },
    ]);
    expect(projectRows.every((p) => !("tasks" in p))).toBe(true);
  });

  it("tasks をフラット化し、projectId・orgId とプロジェクト内の sortOrder を付与する（未アサイン=空文字を維持）", () => {
    const { taskRows } = buildSeedRows(categories, members, projects, orgId);
    expect(taskRows).toEqual([
      {
        id: "t1-1",
        projectId: "pr1",
        title: "要件定義",
        done: true,
        dueDate: "2026-06-20",
        assigneeId: "m1",
        memo: "",
        sortOrder: 0,
        orgId,
      },
      {
        id: "t1-2",
        projectId: "pr1",
        title: "実装",
        done: false,
        dueDate: "",
        assigneeId: "",
        memo: "",
        sortOrder: 1,
        orgId,
      },
    ]);
  });

  it("タスク0件のプロジェクトからは何も生成しない", () => {
    const { taskRows } = buildSeedRows(categories, members, projects, orgId);
    expect(taskRows.filter((t) => t.projectId === "pr2")).toEqual([]);
  });
});

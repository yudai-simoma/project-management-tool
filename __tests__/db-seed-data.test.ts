import { describe, expect, it } from "vitest";

import { buildSeedRows } from "@/db/seed-data";
import type { Project } from "@/lib/schema";
import {
  DEFAULT_LARGE_TASK_TITLE,
  getDefaultLargeTaskId,
} from "@/lib/task-hierarchy";

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
        parentTaskId: null,
        level: "small",
        title: "要件定義",
        done: true,
        dueDate: "2026-06-20",
        assigneeId: "user_1",
        memo: "",
      },
      {
        id: "t1-2",
        parentTaskId: null,
        level: "small",
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
  it("projects の配列順を sortOrder として採番し、orgId を付与し、カテゴリを持たない", () => {
    const { projectRows } = buildSeedRows(projects, orgId);
    expect(projectRows).toEqual([
      {
        id: "pr1",
        name: "モバイルアプリ新機能開発",
        status: "inProgress",
        deadline: "2026-07-05",
        sortOrder: 0,
        orgId,
      },
      {
        id: "pr2",
        name: "オフィス移転プロジェクト",
        status: "planning",
        deadline: "",
        sortOrder: 1,
        orgId,
      },
    ]);
    expect(projectRows.every((p) => !("tasks" in p))).toBe(true);
    expect(projectRows.every((p) => !("categoryId" in p))).toBe(true);
  });

  it("各プロジェクトにデフォルト大項目を作り、旧タスクを小項目としてぶら下げる", () => {
    const { taskRows } = buildSeedRows(projects, orgId);
    const parentTaskId = getDefaultLargeTaskId("pr1");

    expect(taskRows).toEqual([
      {
        id: parentTaskId,
        projectId: "pr1",
        parentTaskId: null,
        level: "large",
        title: DEFAULT_LARGE_TASK_TITLE,
        done: false,
        dueDate: "",
        assigneeId: "",
        memo: "",
        sortOrder: 0,
        orgId,
      },
      {
        id: "t1-1",
        projectId: "pr1",
        parentTaskId,
        level: "small",
        title: "要件定義",
        done: true,
        dueDate: "2026-06-20",
        assigneeId: "user_1",
        memo: "",
        sortOrder: 0,
        orgId,
      },
      {
        id: "t1-2",
        projectId: "pr1",
        parentTaskId,
        level: "small",
        title: "実装",
        done: false,
        dueDate: "",
        assigneeId: "",
        memo: "",
        sortOrder: 1,
        orgId,
      },
      {
        id: getDefaultLargeTaskId("pr2"),
        projectId: "pr2",
        parentTaskId: null,
        level: "large",
        title: DEFAULT_LARGE_TASK_TITLE,
        done: false,
        dueDate: "",
        assigneeId: "",
        memo: "",
        sortOrder: 0,
        orgId,
      },
    ]);
  });

  it("タスク0件のプロジェクトにも未分類の大項目を生成する", () => {
    const { taskRows } = buildSeedRows(projects, orgId);
    expect(taskRows.filter((t) => t.projectId === "pr2")).toEqual([
      {
        id: getDefaultLargeTaskId("pr2"),
        projectId: "pr2",
        parentTaskId: null,
        level: "large",
        title: DEFAULT_LARGE_TASK_TITLE,
        done: false,
        dueDate: "",
        assigneeId: "",
        memo: "",
        sortOrder: 0,
        orgId,
      },
    ]);
  });
});

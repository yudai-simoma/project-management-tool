import { describe, it, expect } from "vitest";

import {
  categoriesSchema,
  membersSchema,
  projectsSchema,
  workspaceSchema,
  categorySchema,
  memberSchema,
  projectSchema,
  taskSchema,
} from "@/lib/schema";

import categoriesData from "@/data/categories.json";
import membersData from "@/data/members.json";
import projectsData from "@/data/projects.json";
import workspaceData from "@/data/workspace.json";

describe("data/*.json schema validation", () => {
  it("data/categories.json は categoriesSchema を満たす", () => {
    const result = categoriesSchema.safeParse(categoriesData);
    expect(result.success).toBe(true);
  });

  it("data/members.json は membersSchema を満たす", () => {
    const result = membersSchema.safeParse(membersData);
    expect(result.success).toBe(true);
  });

  it("data/projects.json は projectsSchema を満たす", () => {
    const result = projectsSchema.safeParse(projectsData);
    expect(result.success).toBe(true);
  });

  it("data/workspace.json は workspaceSchema を満たす", () => {
    const result = workspaceSchema.safeParse(workspaceData);
    expect(result.success).toBe(true);
  });
});

describe("categorySchema", () => {
  it("id / name を持てば成功", () => {
    expect(
      categorySchema.safeParse({ id: "cat1", name: "プロダクト開発" }).success,
    ).toBe(true);
  });

  it("name が欠けていれば失敗", () => {
    expect(categorySchema.safeParse({ id: "cat1" }).success).toBe(false);
  });
});

describe("memberSchema", () => {
  it("id / name / role を持てば成功", () => {
    expect(
      memberSchema.safeParse({ id: "m1", name: "佐藤 健太", role: "owner" })
        .success,
    ).toBe(true);
  });

  it("role が3段階以外なら失敗", () => {
    expect(
      memberSchema.safeParse({ id: "m1", name: "佐藤 健太", role: "guest" })
        .success,
    ).toBe(false);
  });

  it("必須フィールドが欠けていれば失敗", () => {
    expect(
      memberSchema.safeParse({ id: "m1", name: "佐藤 健太" }).success,
    ).toBe(false);
  });
});

describe("taskSchema", () => {
  const baseTask = {
    id: "t1",
    title: "要件定義",
    done: false,
    dueDate: "2026-07-01",
    assigneeId: "m1",
    memo: "",
  };

  it("5項目すべて揃っていれば成功", () => {
    expect(taskSchema.safeParse(baseTask).success).toBe(true);
  });

  it("done が boolean でなければ失敗", () => {
    expect(taskSchema.safeParse({ ...baseTask, done: "yes" }).success).toBe(
      false,
    );
  });

  it("必須フィールドが欠けていれば失敗", () => {
    const rest: Record<string, unknown> = { ...baseTask };
    delete rest.title;
    expect(taskSchema.safeParse(rest).success).toBe(false);
  });
});

describe("projectSchema", () => {
  const baseProject = {
    id: "pr1",
    name: "基幹システムリプレイス",
    categoryId: "cat1",
    status: "inProgress",
    deadline: "2026-07-10",
    tasks: [],
  };

  it("status が4段階のいずれかであれば成功", () => {
    for (const status of ["planning", "inProgress", "review", "done"]) {
      expect(projectSchema.safeParse({ ...baseProject, status }).success).toBe(
        true,
      );
    }
  });

  it("status が未知の値なら失敗", () => {
    expect(
      projectSchema.safeParse({ ...baseProject, status: "unknown" }).success,
    ).toBe(false);
  });

  it("tasks に不正な Task が含まれていれば失敗", () => {
    expect(
      projectSchema.safeParse({
        ...baseProject,
        tasks: [{ id: "t1", title: "x" }],
      }).success,
    ).toBe(false);
  });
});

describe("schema rejects invalid top-level data", () => {
  it("categoriesSchema は配列を期待する", () => {
    expect(categoriesSchema.safeParse({}).success).toBe(false);
    expect(categoriesSchema.safeParse(null).success).toBe(false);
  });

  it("workspaceSchema は name と icon を要求する", () => {
    expect(workspaceSchema.safeParse({ name: "" }).success).toBe(false);
    expect(workspaceSchema.safeParse({ icon: "" }).success).toBe(false);
  });
});

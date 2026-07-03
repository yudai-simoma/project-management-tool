import { type Task, type Project, type ProjectStatusKey } from "@/lib/schema";

/**
 * タスク追加時に Workspace が生成する最小 Task。
 * タイトルのみ指定し、他は空値（`assigneeId` は未アサイン状態の空文字）。
 * Pane 4 詳細タブで inline edit すれば期限・担当者・メモを追記できる。
 */
export function createMinimalTask(title: string): Task {
  return {
    id: `t-${crypto.randomUUID()}`,
    parentTaskId: null,
    level: "small",
    title,
    done: false,
    dueDate: "",
    assigneeId: "",
    memo: "",
  };
}

/**
 * プロジェクト追加時に Workspace が生成する最小 Project。
 * カテゴリ廃止後は Pane 1 のフラットなプロジェクト一覧から追加する。
 */
export function createEmptyProject(
  name: string,
  status: ProjectStatusKey = "planning",
): Project {
  return {
    id: `p-${crypto.randomUUID()}`,
    name,
    status,
    deadline: "",
    tasks: [],
  };
}

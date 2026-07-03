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
 * `categoryId` は追加元の Pane 1 グループから、`status` は追加先のカンバン列から渡される。
 */
export function createEmptyProject(
  categoryId: string,
  name: string,
  status: ProjectStatusKey = "planning",
): Project {
  return {
    id: `p-${crypto.randomUUID()}`,
    name,
    categoryId,
    status,
    deadline: "",
    tasks: [],
  };
}

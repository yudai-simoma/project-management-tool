import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectListPane } from "@/components/workspace/ProjectListPane";
import type { Member, Project, Task } from "@/lib/schema";

const members: Member[] = [
  { id: "m-1", name: "佐藤", role: "member" },
  { id: "m-2", name: "鈴木", role: "admin" },
];

const task = (over: Partial<Task>): Task => ({
  id: "t-1",
  parentTaskId: null,
  level: "large",
  title: "タスク",
  done: false,
  dueDate: "",
  assigneeId: "",
  memo: "",
  ...over,
});

const project: Project = {
  id: "p-1",
  name: "基幹システム刷新",
  status: "inProgress",
  deadline: "",
  tasks: [
    task({
      id: "large-1",
      level: "large",
      title: "要件定義",
      dueDate: "2026-07-10",
    }),
    task({
      id: "medium-1",
      parentTaskId: "large-1",
      level: "medium",
      title: "画面設計",
      done: true,
      dueDate: "2026-07-10",
    }),
    task({
      id: "small-1",
      parentTaskId: "medium-1",
      level: "small",
      title: "一覧画面を確認",
      done: true,
      dueDate: "2026-07-11",
    }),
    task({
      id: "small-2",
      parentTaskId: "medium-1",
      level: "small",
      title: "期日なしタスク",
    }),
  ],
};

describe("TaskCalendarView", () => {
  it("Pane2上部に期日あり/完了タスクのカレンダー集計を表示する", () => {
    render(
      <ProjectListPane
        project={project}
        members={members}
        selectedTaskId="large-1"
        onSelectTask={vi.fn()}
        onAddTask={vi.fn()}
      />,
    );

    expect(screen.getByText("カレンダー")).toBeInTheDocument();
    expect(screen.getByText("期日 3")).toBeInTheDocument();
    expect(screen.getByText("完了 2")).toBeInTheDocument();
    expect(screen.getByText(/7月10日/)).toBeInTheDocument();
    expect(screen.getByText("未完了 1")).toBeInTheDocument();
    expect(screen.getByText("完了 1")).toBeInTheDocument();
    expect(screen.getAllByText("要件定義").length).toBeGreaterThan(0);
    expect(screen.getAllByText("画面設計").length).toBeGreaterThan(0);
    expect(screen.queryByText("期日なしタスク")).not.toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectDashboardPane } from "@/components/workspace/ProjectDashboardPane";
import { ProjectListPane } from "@/components/workspace/ProjectListPane";
import type { Member, Project, Task } from "@/lib/schema";

const members: Member[] = [{ id: "m-1", name: "佐藤", role: "member" }];

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
    task({ id: "large-1", level: "large", title: "要件定義" }),
    task({ id: "large-2", level: "large", title: "リリース準備" }),
    task({
      id: "small-1",
      parentTaskId: "large-1",
      level: "small",
      title: "未完了小項目",
      done: false,
    }),
    task({
      id: "small-2",
      parentTaskId: "large-1",
      level: "small",
      title: "完了小項目",
      done: true,
    }),
    task({
      id: "small-3",
      parentTaskId: "large-2",
      level: "small",
      title: "完了済みの配下",
      done: true,
    }),
  ],
};

describe("task progress UI", () => {
  it("Pane2に大項目の進捗率と完了済みセクションを表示する", () => {
    render(
      <ProjectListPane
        project={project}
        members={members}
        selectedTaskId="large-1"
        onSelectTask={vi.fn()}
        onAddTask={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("要件定義の進捗率 50%")).toBeInTheDocument();
    expect(screen.getByText("完了済み 1")).toBeInTheDocument();
  });

  it("Pane3に小項目の進捗率と完了済みセクションを表示する", () => {
    render(
      <ProjectDashboardPane
        project={project}
        activeTaskId="large-1"
        members={members}
        selectedDetail={null}
        onOpenDetail={vi.fn()}
        onToggleTaskDone={vi.fn()}
        onAddTask={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("要件定義の進捗率 50%")).toBeInTheDocument();
    expect(
      screen.getByLabelText("未完了小項目の進捗率 0%"),
    ).toBeInTheDocument();
    expect(screen.getByText("完了済み 1")).toBeInTheDocument();
  });
});

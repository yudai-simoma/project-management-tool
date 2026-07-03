import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { PortfolioDashboardPane } from "@/components/workspace/PortfolioDashboardPane";
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

const projects: Project[] = [
  {
    id: "p-overdue",
    name: "遅延プロジェクト",
    status: "inProgress",
    deadline: "2000-01-01",
    tasks: [
      task({ id: "large-1", level: "large", title: "リリース準備" }),
      task({
        id: "small-1",
        parentTaskId: "large-1",
        level: "small",
        title: "期限対応",
        dueDate: "2000-01-01",
        assigneeId: "m-1",
      }),
    ],
  },
  {
    id: "p-done",
    name: "完了プロジェクト",
    status: "done",
    deadline: "2000-01-01",
    tasks: [
      task({ id: "large-2", level: "large", title: "検収" }),
      task({
        id: "small-2",
        parentTaskId: "large-2",
        level: "small",
        title: "検収完了",
        done: true,
      }),
    ],
  },
];

describe("PortfolioDashboardPane", () => {
  it("リスクKPI、プロジェクト一覧、直近期限、ワークロードを表示する", () => {
    render(
      <PortfolioDashboardPane
        projects={projects}
        members={members}
        onOpenProject={vi.fn()}
        onOpenTask={vi.fn()}
      />,
    );

    expect(screen.getByText("期限超過プロジェクト")).toBeInTheDocument();
    expect(screen.getByText("平均進捗")).toBeInTheDocument();
    expect(screen.getByText("未完了タスク")).toBeInTheDocument();
    expect(screen.getByText("プロジェクト一覧")).toBeInTheDocument();
    expect(screen.getByText("直近期限タスク")).toBeInTheDocument();
    expect(screen.getByText("メンバー別ワークロード")).toBeInTheDocument();
    expect(screen.getByText("遅延プロジェクト")).toBeInTheDocument();
    expect(screen.getByText("完了プロジェクト")).toBeInTheDocument();
    expect(screen.getByText("期限対応")).toBeInTheDocument();
    expect(screen.getAllByText("佐藤").length).toBeGreaterThan(0);
  });

  it("プロジェクト行クリックで該当プロジェクトIDを返す", () => {
    const onOpenProject = vi.fn();
    render(
      <PortfolioDashboardPane
        projects={projects}
        members={members}
        onOpenProject={onOpenProject}
        onOpenTask={vi.fn()}
      />,
    );

    const projectCard = screen
      .getByText("プロジェクト一覧")
      .closest("[data-slot='card']");
    expect(projectCard).not.toBeNull();

    fireEvent.click(within(projectCard!).getByText("遅延プロジェクト"));

    expect(onOpenProject).toHaveBeenCalledWith("p-overdue");
  });

  it("直近期限タスク行クリックでプロジェクトIDとタスクIDを返す", () => {
    const onOpenTask = vi.fn();
    render(
      <PortfolioDashboardPane
        projects={projects}
        members={members}
        onOpenProject={vi.fn()}
        onOpenTask={onOpenTask}
      />,
    );

    const taskCard = screen
      .getByText("直近期限タスク")
      .closest("[data-slot='card']");
    expect(taskCard).not.toBeNull();

    fireEvent.click(within(taskCard!).getByText("期限対応"));

    expect(onOpenTask).toHaveBeenCalledWith("p-overdue", "small-1");
  });
});

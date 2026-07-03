import { describe, it, expect } from "vitest";

import { type Project, type Task } from "@/lib/schema";
import {
  getProjectProgress,
  deriveDeadlineRisk,
  getTaskCounts,
  getStatusCounts,
  getTaskCalendarDays,
} from "@/lib/computed/projects";

const baseTask = (over: Partial<Task>): Task => ({
  id: "t1",
  parentTaskId: "large-1",
  level: "small",
  title: "タスク",
  done: false,
  dueDate: "",
  assigneeId: "",
  memo: "",
  ...over,
});

const baseProject = (over: Partial<Project>): Project => ({
  id: "pr1",
  name: "テストプロジェクト",
  status: "inProgress",
  deadline: "",
  tasks: [],
  ...over,
});

describe("getProjectProgress", () => {
  it("タスクが0件なら0%", () => {
    expect(getProjectProgress(baseProject({ tasks: [] }))).toBe(0);
  });

  it("完了タスクの比率で算出する", () => {
    const project = baseProject({
      tasks: [
        baseTask({ id: "large-1", parentTaskId: null, level: "large" }),
        baseTask({ id: "t1", done: true }),
        baseTask({ id: "t2", done: true }),
        baseTask({ id: "t3", done: false }),
        baseTask({ id: "t4", done: false }),
      ],
    });
    expect(getProjectProgress(project)).toBe(50);
  });

  it("全タスク完了なら100%", () => {
    const project = baseProject({
      tasks: [
        baseTask({ id: "large-1", parentTaskId: null, level: "large" }),
        baseTask({ id: "t1", done: true }),
      ],
    });
    expect(getProjectProgress(project)).toBe(100);
  });

  it("端数は丸める", () => {
    const project = baseProject({
      tasks: [
        baseTask({ id: "large-1", parentTaskId: null, level: "large" }),
        baseTask({ id: "t1", done: true }),
        baseTask({ id: "t2", done: false }),
        baseTask({ id: "t3", done: false }),
      ],
    });
    // 1/3 = 33.33...% → 33%
    expect(getProjectProgress(project)).toBe(33);
  });
});

describe("getTaskCounts", () => {
  it("完了数と総数を返す", () => {
    const project = baseProject({
      tasks: [
        baseTask({ id: "large-1", parentTaskId: null, level: "large" }),
        baseTask({ id: "t1", done: true }),
        baseTask({ id: "t2", done: false }),
      ],
    });
    expect(getTaskCounts(project)).toEqual({ done: 1, total: 2 });
  });

  it("タスクが0件なら done: 0, total: 0", () => {
    expect(getTaskCounts(baseProject({ tasks: [] }))).toEqual({
      done: 0,
      total: 0,
    });
  });
});

describe("getTaskCalendarDays", () => {
  it("期日を持つタスクを日付別に集計し、完了/未完了を分ける", () => {
    const days = getTaskCalendarDays([
      baseTask({ id: "large-1", parentTaskId: null, level: "large" }),
      baseTask({ id: "t1", dueDate: "2026-07-10", done: false }),
      baseTask({ id: "t2", dueDate: "2026-07-10", done: true }),
      baseTask({ id: "t3", dueDate: "2026-07-11", done: true }),
    ]);

    expect(days.map((day) => day.date)).toEqual(["2026-07-10", "2026-07-11"]);
    expect(days[0].tasks.map((task) => task.id)).toEqual(["t1", "t2"]);
    expect(days[0].openTasks.map((task) => task.id)).toEqual(["t1"]);
    expect(days[0].doneTasks.map((task) => task.id)).toEqual(["t2"]);
  });

  it("期日なしと不正な日付は除外し、日付昇順で返す", () => {
    const days = getTaskCalendarDays([
      baseTask({ id: "t1", dueDate: "not-a-date" }),
      baseTask({ id: "t2", dueDate: "2026-08-01" }),
      baseTask({ id: "t3", dueDate: "" }),
      baseTask({ id: "t4", dueDate: "2026-07-01" }),
    ]);

    expect(days.map((day) => day.date)).toEqual(["2026-07-01", "2026-08-01"]);
  });
});

describe("getStatusCounts", () => {
  it("ステータス別の件数を集計する（空ステータスも0件で含む）", () => {
    const projects = [
      baseProject({ id: "p1", status: "planning" }),
      baseProject({ id: "p2", status: "inProgress" }),
      baseProject({ id: "p3", status: "inProgress" }),
      baseProject({ id: "p4", status: "done" }),
    ];
    expect(getStatusCounts(projects)).toEqual({
      planning: 1,
      inProgress: 2,
      review: 0,
      done: 1,
    });
  });

  it("プロジェクトが0件なら全ステータス0件", () => {
    expect(getStatusCounts([])).toEqual({
      planning: 0,
      inProgress: 0,
      review: 0,
      done: 0,
    });
  });
});

describe("deriveDeadlineRisk", () => {
  // 起算日を 2026-07-03 に固定してテストする。
  const referenceDate = new Date(2026, 6, 3);

  it("期限が未設定なら none", () => {
    expect(deriveDeadlineRisk("", referenceDate)).toBe("none");
  });

  it("今日を過ぎていれば overdue", () => {
    expect(deriveDeadlineRisk("2026-07-01", referenceDate)).toBe("overdue");
  });

  it("残り7日以内なら dueSoon", () => {
    expect(deriveDeadlineRisk("2026-07-03", referenceDate)).toBe("dueSoon");
    expect(deriveDeadlineRisk("2026-07-10", referenceDate)).toBe("dueSoon");
  });

  it("残り8日以上なら onTrack", () => {
    expect(deriveDeadlineRisk("2026-07-11", referenceDate)).toBe("onTrack");
  });

  it("referenceDate 省略時は現在時刻を使う", () => {
    const past = "2000-01-01";
    expect(deriveDeadlineRisk(past)).toBe("overdue");
  });
});

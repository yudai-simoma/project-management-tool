import { describe, it, expect } from "vitest";

import { type Project, type Task } from "@/lib/schema";
import {
  getProjectProgress,
  getTaskCompletionGroups,
  deriveDeadlineRisk,
  getTaskCounts,
  getTaskProgressSummary,
  getTaskProgressSummaryForTask,
  getStatusCounts,
  getTaskCalendarDays,
  getPortfolioDashboardSummary,
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

describe("getTaskProgressSummary", () => {
  it("親タスクに小項目がなければ0%", () => {
    const tasks = [
      baseTask({ id: "large-1", parentTaskId: null, level: "large" }),
    ];

    expect(getTaskProgressSummary(tasks, "large-1")).toEqual({
      done: 0,
      total: 0,
      percent: 0,
    });
  });

  it("大項目は配下の小項目完了率で算出する", () => {
    const tasks = [
      baseTask({ id: "large-1", parentTaskId: null, level: "large" }),
      baseTask({ id: "medium-1", parentTaskId: "large-1", level: "medium" }),
      baseTask({ id: "small-1", parentTaskId: "medium-1", done: true }),
      baseTask({ id: "small-2", parentTaskId: "medium-1", done: false }),
      baseTask({ id: "small-3", parentTaskId: "large-1", done: true }),
    ];

    expect(getTaskProgressSummary(tasks, "large-1")).toEqual({
      done: 2,
      total: 3,
      percent: 67,
    });
  });

  it("小項目は未完了0%、完了100%", () => {
    const openTask = baseTask({ id: "small-1", done: false });
    const doneTask = baseTask({ id: "small-2", done: true });

    expect(getTaskProgressSummaryForTask([openTask], openTask)).toEqual({
      done: 0,
      total: 1,
      percent: 0,
    });
    expect(getTaskProgressSummaryForTask([doneTask], doneTask)).toEqual({
      done: 1,
      total: 1,
      percent: 100,
    });
  });
});

describe("getTaskCompletionGroups", () => {
  it("未完了タスクを上、完了済みタスクを下に分け、元の順序を保つ", () => {
    const tasks = [
      baseTask({ id: "large-open", parentTaskId: null, level: "large" }),
      baseTask({ id: "large-done", parentTaskId: null, level: "large" }),
      baseTask({ id: "large-open-2", parentTaskId: null, level: "large" }),
      baseTask({ id: "small-open", parentTaskId: "large-open", done: false }),
      baseTask({ id: "small-done", parentTaskId: "large-done", done: true }),
      baseTask({
        id: "small-open-2",
        parentTaskId: "large-open-2",
        done: false,
      }),
    ];

    const groups = getTaskCompletionGroups(
      tasks,
      tasks.filter((task) => task.level === "large"),
    );

    expect(groups.openTasks.map((task) => task.id)).toEqual([
      "large-open",
      "large-open-2",
    ]);
    expect(groups.completedTasks.map((task) => task.id)).toEqual([
      "large-done",
    ]);
  });

  it("小項目はdoneフラグで完了済みに分ける", () => {
    const tasks = [
      baseTask({ id: "small-open", done: false }),
      baseTask({ id: "small-done", done: true }),
    ];

    const groups = getTaskCompletionGroups(tasks, tasks);

    expect(groups.openTasks.map((task) => task.id)).toEqual(["small-open"]);
    expect(groups.completedTasks.map((task) => task.id)).toEqual([
      "small-done",
    ]);
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

describe("getPortfolioDashboardSummary", () => {
  const referenceDate = new Date(2026, 6, 3);
  const members = [
    { id: "m-1", name: "佐藤", role: "member" as const },
    { id: "m-2", name: "鈴木", role: "admin" as const },
  ];

  it("リスクKPI・平均進捗・未完了タスク数を集計する", () => {
    const summary = getPortfolioDashboardSummary(
      [
        baseProject({
          id: "overdue",
          name: "期限超過",
          deadline: "2026-07-01",
          tasks: [
            baseTask({ id: "large-1", parentTaskId: null, level: "large" }),
            baseTask({
              id: "small-1",
              parentTaskId: "large-1",
              dueDate: "2026-07-01",
              assigneeId: "m-1",
            }),
          ],
        }),
        baseProject({
          id: "soon",
          name: "期限間近",
          deadline: "2026-07-10",
          tasks: [
            baseTask({ id: "large-2", parentTaskId: null, level: "large" }),
            baseTask({
              id: "small-2",
              parentTaskId: "large-2",
              dueDate: "2026-07-10",
              assigneeId: "m-2",
            }),
            baseTask({
              id: "small-3",
              parentTaskId: "large-2",
              done: true,
            }),
          ],
        }),
        baseProject({
          id: "done",
          name: "完了",
          status: "done",
          deadline: "2026-07-01",
          tasks: [
            baseTask({ id: "large-3", parentTaskId: null, level: "large" }),
            baseTask({
              id: "small-4",
              parentTaskId: "large-3",
              done: true,
            }),
          ],
        }),
      ],
      members,
      referenceDate,
    );

    expect(summary.overdueProjectCount).toBe(1);
    expect(summary.dueSoonProjectCount).toBe(1);
    expect(summary.overdueTaskCount).toBe(1);
    expect(summary.dueSoonTaskCount).toBe(1);
    expect(summary.averageProgress).toBe(50);
    expect(summary.openTaskCount).toBe(4);
    expect(summary.projectSummaries.map((item) => item.project.id)).toEqual([
      "overdue",
      "soon",
      "done",
    ]);
  });

  it("直近期限タスクは未完了のみ期限順で最大10件に絞る", () => {
    const project = baseProject({
      id: "p-1",
      tasks: [
        baseTask({ id: "large-1", parentTaskId: null, level: "large" }),
        ...Array.from({ length: 12 }, (_, index) =>
          baseTask({
            id: `small-${index}`,
            parentTaskId: "large-1",
            dueDate: `2026-07-${String(index + 1).padStart(2, "0")}`,
            done: index === 0,
          }),
        ),
      ],
    });

    const summary = getPortfolioDashboardSummary(
      [project],
      members,
      referenceDate,
    );

    expect(summary.upcomingTasks).toHaveLength(10);
    expect(summary.upcomingTasks.map((item) => item.task.id)).toEqual([
      "small-1",
      "small-2",
      "small-3",
      "small-4",
      "small-5",
      "small-6",
      "small-7",
      "small-8",
      "small-9",
      "small-10",
    ]);
  });

  it("メンバー別ワークロードは未アサインを含めて負荷が重い順に並べる", () => {
    const project = baseProject({
      tasks: [
        baseTask({ id: "large-1", parentTaskId: null, level: "large" }),
        baseTask({
          id: "small-1",
          parentTaskId: "large-1",
          assigneeId: "m-1",
          dueDate: "2026-07-01",
        }),
        baseTask({
          id: "small-2",
          parentTaskId: "large-1",
          assigneeId: "m-1",
          dueDate: "2026-07-10",
        }),
        baseTask({
          id: "small-3",
          parentTaskId: "large-1",
          assigneeId: "",
          dueDate: "2026-07-20",
        }),
      ],
    });

    const summary = getPortfolioDashboardSummary(
      [project],
      members,
      referenceDate,
    );

    expect(summary.memberWorkloads.map((item) => item.memberName)).toEqual([
      "佐藤",
      "未アサイン",
      "鈴木",
    ]);
    expect(summary.memberWorkloads[0]).toMatchObject({
      openTaskCount: 2,
      overdueTaskCount: 1,
      dueSoonTaskCount: 1,
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

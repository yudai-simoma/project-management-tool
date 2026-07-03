/**
 * Project / Task の派生計算 SSoT。
 *
 * Pane 2 プロジェクト行の進捗率バー・期限バッジと、Pane 3 ダッシュボードの
 * 概要ヘッダー・AI進捗サマリーは、同じ意味の値を表示する。同じ計算を
 * 2 箇所で持つと「ある日 Pane 2 だけ違う値が出る」事故が発生するため、
 * 計算ロジックは本ファイルの関数に集約する MUST。
 */

import {
  compareAsc,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from "date-fns";

import {
  type Project,
  type Task,
  type DeadlineRisk,
  type ProjectStatusKey,
  STATUS_ORDER,
} from "@/lib/schema";
import { parseISODate } from "@/lib/utils";

/** 期限が近いと判断する残り日数のしきい値（この日数以下で "dueSoon"）。 */
const DUE_SOON_THRESHOLD_DAYS = 7;

export type TaskCalendarDay = {
  date: string;
  dateValue: Date;
  tasks: Task[];
  openTasks: Task[];
  doneTasks: Task[];
};

export type TaskProgressSummary = {
  done: number;
  total: number;
  percent: number;
};

export type TaskCompletionGroups = {
  openTasks: Task[];
  completedTasks: Task[];
};

/**
 * プロジェクトの進捗率（0〜100）。タスクの完了比率から自動計算する。
 * タスクが 0 件のプロジェクトは 0% とする（手動入力は行わない）。
 */
export function getProjectProgress(project: Project): number {
  return getTaskProgress(project.tasks, null);
}

/**
 * 期限文字列（YYYY-MM-DD）から期限リスクを導出する。
 *
 *   - 期限未設定                        → "none"
 *   - 今日を過ぎている                  → "overdue"
 *   - 残り `DUE_SOON_THRESHOLD_DAYS` 日以内 → "dueSoon"
 *   - それ以外                          → "onTrack"
 *
 * `referenceDate` はテスト容易性のため差し替え可能にしている（既定は現在時刻）。
 */
export function deriveDeadlineRisk(
  deadline: string,
  referenceDate: Date = new Date(),
): DeadlineRisk {
  const due = parseISODate(deadline);
  if (!due) return "none";
  const diffDays = differenceInCalendarDays(due, referenceDate);
  if (diffDays < 0) return "overdue";
  if (diffDays <= DUE_SOON_THRESHOLD_DAYS) return "dueSoon";
  return "onTrack";
}

/** プロジェクトのタスク完了数・総数を返す。Pane 3 の「◯/◯ 完了」表示用。 */
export function getTaskCounts(project: Project): {
  done: number;
  total: number;
} {
  return getSmallTaskCounts(project.tasks, null);
}

export function getTaskChildren(tasks: Task[], parentTaskId: string | null) {
  return tasks.filter((task) => task.parentTaskId === parentTaskId);
}

export function getLargeTasks(tasks: Task[]) {
  return tasks.filter((task) => task.level === "large");
}

export function getMediumTasks(tasks: Task[], largeTaskId: string) {
  return tasks.filter(
    (task) => task.level === "medium" && task.parentTaskId === largeTaskId,
  );
}

export function getSmallTasks(tasks: Task[], parentTaskId: string) {
  return tasks.filter(
    (task) => task.level === "small" && task.parentTaskId === parentTaskId,
  );
}

export function findTaskById(tasks: Task[], taskId: string | null) {
  if (!taskId) return null;
  return tasks.find((task) => task.id === taskId) ?? null;
}

export function getTaskLineage(tasks: Task[], task: Task | null) {
  const lineage: Task[] = [];
  let current = task;
  while (current) {
    lineage.unshift(current);
    current = findTaskById(tasks, current.parentTaskId);
  }
  return lineage;
}

export function getSmallTaskCounts(
  tasks: Task[],
  parentTaskId: string | null,
): {
  done: number;
  total: number;
} {
  const parent = findTaskById(tasks, parentTaskId);
  const scopedTasks =
    parentTaskId === null
      ? tasks
      : tasks.filter((task) => isDescendantOf(tasks, task, parentTaskId));
  const smallTasks = scopedTasks.filter((task) => {
    if (task.level !== "small") return false;
    if (!parent) return true;
    return task.id === parent.id || isDescendantOf(tasks, task, parent.id);
  });

  return {
    done: smallTasks.filter((task) => task.done).length,
    total: smallTasks.length,
  };
}

export function getTaskProgress(
  tasks: Task[],
  parentTaskId: string | null,
): number {
  return getTaskProgressSummary(tasks, parentTaskId).percent;
}

export function getTaskProgressSummary(
  tasks: Task[],
  parentTaskId: string | null,
): TaskProgressSummary {
  const { done, total } = getSmallTaskCounts(tasks, parentTaskId);
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function getTaskProgressSummaryForTask(
  tasks: Task[],
  task: Task,
): TaskProgressSummary {
  if (task.level === "small") {
    return {
      done: task.done ? 1 : 0,
      total: 1,
      percent: task.done ? 100 : 0,
    };
  }

  return getTaskProgressSummary(tasks, task.id);
}

export function getTaskCompletionGroups(
  allTasks: Task[],
  tasks: Task[],
): TaskCompletionGroups {
  const groups: TaskCompletionGroups = {
    openTasks: [],
    completedTasks: [],
  };

  for (const task of tasks) {
    if (isTaskComplete(allTasks, task)) {
      groups.completedTasks.push(task);
    } else {
      groups.openTasks.push(task);
    }
  }

  return groups;
}

export function getTaskCalendarDays(tasks: Task[]): TaskCalendarDay[] {
  const days = new Map<string, TaskCalendarDay>();

  for (const task of tasks) {
    if (!task.dueDate) continue;

    const dateValue = parseISO(task.dueDate);
    if (!isValid(dateValue)) continue;

    const date = format(dateValue, "yyyy-MM-dd");
    const day = days.get(date) ?? {
      date,
      dateValue,
      tasks: [],
      openTasks: [],
      doneTasks: [],
    };

    day.tasks.push(task);
    if (task.done) {
      day.doneTasks.push(task);
    } else {
      day.openTasks.push(task);
    }
    days.set(date, day);
  }

  return [...days.values()].sort((a, b) =>
    compareAsc(a.dateValue, b.dateValue),
  );
}

function isTaskComplete(tasks: Task[], task: Task): boolean {
  if (task.level === "small") return task.done;

  const { done, total } = getSmallTaskCounts(tasks, task.id);
  return total > 0 && done === total;
}

function isDescendantOf(
  tasks: Task[],
  task: Task,
  ancestorTaskId: string,
): boolean {
  let currentParentId = task.parentTaskId;
  while (currentParentId) {
    if (currentParentId === ancestorTaskId) return true;
    currentParentId = findTaskById(tasks, currentParentId)?.parentTaskId ?? null;
  }
  return false;
}

/**
 * ステータス別のプロジェクト件数。全体ダッシュボード（PortfolioDashboardPane）で使用する。
 * 空ステータスも 0 件として必ず全キーを返す（STATUS_ORDER の 4 段階固定）。
 */
export function getStatusCounts(
  projects: Project[],
): Record<ProjectStatusKey, number> {
  const counts = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, 0]),
  ) as Record<ProjectStatusKey, number>;
  for (const project of projects) {
    counts[project.status]++;
  }
  return counts;
}

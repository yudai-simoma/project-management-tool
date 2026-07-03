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
  type Member,
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

export type PortfolioRiskLevel = "danger" | "warning" | "success";

export type PortfolioProjectSummary = {
  project: Project;
  progress: number;
  doneCount: number;
  totalCount: number;
  openTaskCount: number;
  riskLevel: PortfolioRiskLevel;
  deadlineRisk: DeadlineRisk;
};

export type PortfolioTaskSummary = {
  project: Project;
  task: Task;
  assigneeName: string;
  parentLabel: string;
  riskLevel: PortfolioRiskLevel;
  deadlineRisk: DeadlineRisk;
};

export type PortfolioMemberWorkload = {
  memberId: string;
  memberName: string;
  openTaskCount: number;
  overdueTaskCount: number;
  dueSoonTaskCount: number;
};

export type PortfolioDashboardSummary = {
  overdueProjectCount: number;
  dueSoonProjectCount: number;
  overdueTaskCount: number;
  dueSoonTaskCount: number;
  averageProgress: number;
  openTaskCount: number;
  projectSummaries: PortfolioProjectSummary[];
  upcomingTasks: PortfolioTaskSummary[];
  memberWorkloads: PortfolioMemberWorkload[];
  statusCounts: Record<ProjectStatusKey, number>;
};

const UNASSIGNED_MEMBER_ID = "__unassigned";
const UNASSIGNED_MEMBER_NAME = "未アサイン";
const UPCOMING_TASK_LIMIT = 10;

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

export function isTaskComplete(tasks: Task[], task: Task): boolean {
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
    currentParentId =
      findTaskById(tasks, currentParentId)?.parentTaskId ?? null;
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

export function getPortfolioDashboardSummary(
  projects: Project[],
  members: Member[],
  referenceDate: Date = new Date(),
): PortfolioDashboardSummary {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const workloads = new Map<string, PortfolioMemberWorkload>();
  const projectSummaries: PortfolioProjectSummary[] = [];
  const taskSummaries: PortfolioTaskSummary[] = [];

  for (const member of members) {
    workloads.set(member.id, {
      memberId: member.id,
      memberName: member.name,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dueSoonTaskCount: 0,
    });
  }
  workloads.set(UNASSIGNED_MEMBER_ID, {
    memberId: UNASSIGNED_MEMBER_ID,
    memberName: UNASSIGNED_MEMBER_NAME,
    openTaskCount: 0,
    overdueTaskCount: 0,
    dueSoonTaskCount: 0,
  });

  for (const project of projects) {
    const progress = getProjectProgress(project);
    const { done, total } = getTaskCounts(project);
    const complete = isProjectComplete(project);
    const deadlineRisk = deriveDeadlineRisk(project.deadline, referenceDate);
    const riskLevel = getPortfolioRiskLevel(deadlineRisk, complete);
    const openTasks = project.tasks.filter(
      (task) => !isTaskComplete(project.tasks, task),
    );

    projectSummaries.push({
      project,
      progress,
      doneCount: done,
      totalCount: total,
      openTaskCount: openTasks.length,
      riskLevel,
      deadlineRisk,
    });

    for (const task of openTasks) {
      const taskDeadlineRisk = deriveDeadlineRisk(task.dueDate, referenceDate);
      const taskRiskLevel = getPortfolioRiskLevel(taskDeadlineRisk, false);
      const assigneeName =
        memberById.get(task.assigneeId)?.name ?? UNASSIGNED_MEMBER_NAME;
      const taskSummary: PortfolioTaskSummary = {
        project,
        task,
        assigneeName,
        parentLabel: getParentTaskLabel(project.tasks, task),
        riskLevel: taskRiskLevel,
        deadlineRisk: taskDeadlineRisk,
      };
      taskSummaries.push(taskSummary);

      const workload = getOrCreateWorkload(
        workloads,
        memberById,
        task.assigneeId,
      );
      workload.openTaskCount++;
      if (taskRiskLevel === "danger") workload.overdueTaskCount++;
      if (taskRiskLevel === "warning") workload.dueSoonTaskCount++;
    }
  }

  const overdueProjectCount = projectSummaries.filter(
    (summary) => summary.riskLevel === "danger",
  ).length;
  const dueSoonProjectCount = projectSummaries.filter(
    (summary) => summary.riskLevel === "warning",
  ).length;
  const overdueTaskCount = taskSummaries.filter(
    (summary) => summary.riskLevel === "danger",
  ).length;
  const dueSoonTaskCount = taskSummaries.filter(
    (summary) => summary.riskLevel === "warning",
  ).length;
  const averageProgress =
    projects.length === 0
      ? 0
      : Math.round(
          projectSummaries.reduce((sum, summary) => sum + summary.progress, 0) /
            projects.length,
        );

  return {
    overdueProjectCount,
    dueSoonProjectCount,
    overdueTaskCount,
    dueSoonTaskCount,
    averageProgress,
    openTaskCount: taskSummaries.length,
    projectSummaries: projectSummaries.sort(comparePortfolioProjectSummaries),
    upcomingTasks: taskSummaries
      .filter((summary) => parseISODate(summary.task.dueDate))
      .sort(comparePortfolioTaskSummaries)
      .slice(0, UPCOMING_TASK_LIMIT),
    memberWorkloads: [...workloads.values()].sort(compareMemberWorkloads),
    statusCounts: getStatusCounts(projects),
  };
}

function isProjectComplete(project: Project): boolean {
  if (project.status === "done") return true;
  const { done, total } = getTaskCounts(project);
  return total > 0 && done === total;
}

function getPortfolioRiskLevel(
  deadlineRisk: DeadlineRisk,
  complete: boolean,
): PortfolioRiskLevel {
  if (complete) return "success";
  if (deadlineRisk === "overdue") return "danger";
  if (deadlineRisk === "dueSoon") return "warning";
  return "success";
}

function getParentTaskLabel(tasks: Task[], task: Task): string {
  const parents = getTaskLineage(tasks, task).slice(0, -1);
  return parents.length > 0
    ? parents.map((parent) => parent.title).join(" / ")
    : "プロジェクト直下";
}

function getOrCreateWorkload(
  workloads: Map<string, PortfolioMemberWorkload>,
  memberById: Map<string, Member>,
  assigneeId: string,
): PortfolioMemberWorkload {
  const memberId = assigneeId || UNASSIGNED_MEMBER_ID;
  const existing = workloads.get(memberId);
  if (existing) return existing;

  const memberName = memberById.get(memberId)?.name ?? "不明なメンバー";
  const workload: PortfolioMemberWorkload = {
    memberId,
    memberName,
    openTaskCount: 0,
    overdueTaskCount: 0,
    dueSoonTaskCount: 0,
  };
  workloads.set(memberId, workload);
  return workload;
}

function comparePortfolioProjectSummaries(
  a: PortfolioProjectSummary,
  b: PortfolioProjectSummary,
) {
  return (
    compareRiskLevel(a.riskLevel, b.riskLevel) ||
    compareDateString(a.project.deadline, b.project.deadline) ||
    a.project.name.localeCompare(b.project.name, "ja")
  );
}

function comparePortfolioTaskSummaries(
  a: PortfolioTaskSummary,
  b: PortfolioTaskSummary,
) {
  return (
    compareDateString(a.task.dueDate, b.task.dueDate) ||
    compareRiskLevel(a.riskLevel, b.riskLevel) ||
    a.task.title.localeCompare(b.task.title, "ja")
  );
}

function compareMemberWorkloads(
  a: PortfolioMemberWorkload,
  b: PortfolioMemberWorkload,
) {
  return (
    b.openTaskCount - a.openTaskCount ||
    b.overdueTaskCount - a.overdueTaskCount ||
    b.dueSoonTaskCount - a.dueSoonTaskCount ||
    a.memberName.localeCompare(b.memberName, "ja")
  );
}

function compareRiskLevel(a: PortfolioRiskLevel, b: PortfolioRiskLevel) {
  return getRiskRank(a) - getRiskRank(b);
}

function getRiskRank(riskLevel: PortfolioRiskLevel): number {
  if (riskLevel === "danger") return 0;
  if (riskLevel === "warning") return 1;
  return 2;
}

function compareDateString(a: string, b: string): number {
  const dateA = parseISODate(a);
  const dateB = parseISODate(b);
  if (dateA && dateB) return compareAsc(dateA, dateB);
  if (dateA) return -1;
  if (dateB) return 1;
  return 0;
}

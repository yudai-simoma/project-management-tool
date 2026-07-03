/**
 * Project / Task の派生計算 SSoT。
 *
 * Pane 2 プロジェクト行の進捗率バー・期限バッジと、Pane 3 ダッシュボードの
 * 概要ヘッダー・AI進捗サマリーは、同じ意味の値を表示する。同じ計算を
 * 2 箇所で持つと「ある日 Pane 2 だけ違う値が出る」事故が発生するため、
 * 計算ロジックは本ファイルの関数に集約する MUST。
 */

import { differenceInCalendarDays } from "date-fns";

import {
  type Project,
  type DeadlineRisk,
  type ProjectStatusKey,
  STATUS_ORDER,
} from "@/lib/schema";
import { parseISODate } from "@/lib/utils";

/** 期限が近いと判断する残り日数のしきい値（この日数以下で "dueSoon"）。 */
const DUE_SOON_THRESHOLD_DAYS = 7;

/**
 * プロジェクトの進捗率（0〜100）。タスクの完了比率から自動計算する。
 * タスクが 0 件のプロジェクトは 0% とする（手動入力は行わない）。
 */
export function getProjectProgress(project: Project): number {
  if (project.tasks.length === 0) return 0;
  const doneCount = project.tasks.filter((t) => t.done).length;
  return Math.round((doneCount / project.tasks.length) * 100);
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
  return {
    done: project.tasks.filter((t) => t.done).length,
    total: project.tasks.length,
  };
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

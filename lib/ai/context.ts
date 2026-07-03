/**
 * AI（進捗サマリー・アシスタント）に渡すプロジェクト情報のテキスト整形。
 * Gemini呼び出し（`app/api/ai/summary`・`app/api/ai/chat`）で共通利用する。
 *
 * 進捗率・期限リスクの算出は `lib/computed/projects.ts` を再利用し、二重実装しない。
 */

import {
  deriveDeadlineRisk,
  getProjectProgress,
  getTaskCounts,
} from "@/lib/computed/projects";
import type { Member, Project } from "@/lib/schema";

export function formatProjectContext(
  project: Project,
  members: Member[],
  categoryName: string,
): string {
  const progress = getProjectProgress(project);
  const { done, total } = getTaskCounts(project);
  const risk = deriveDeadlineRisk(project.deadline);

  const taskLines = project.tasks.length
    ? project.tasks
        .map((t) => {
          const assignee =
            members.find((m) => m.id === t.assigneeId)?.name ?? "未アサイン";
          return `- id=${t.id} [${t.done ? "完了" : "未完了"}] ${t.title}（期限: ${t.dueDate || "未設定"} / 担当: ${assignee} / メモ: ${t.memo || "なし"}）`;
        })
        .join("\n")
    : "(タスクなし)";

  const memberLines = members.length
    ? members.map((m) => `- id=${m.id}: ${m.name}`).join("\n")
    : "(登録メンバーなし)";

  return `プロジェクト名: ${project.name}
カテゴリ: ${categoryName || "未分類"}
期限: ${project.deadline || "未設定"}
期限リスク: ${risk}（overdue=期限超過 / dueSoon=期限間近 / onTrack=順調 / none=期限未設定）
進捗率: ${progress}%（完了 ${done}/${total}）

タスク一覧:
${taskLines}

組織メンバー一覧（担当者を指定する際は必ずこの id を使うこと）:
${memberLines}`;
}

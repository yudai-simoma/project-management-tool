/**
 * AIアシスタント（`app/api/ai/chat`）のtool calling定義。
 *
 * 設計方針: ここの `execute` はDBやAPIを直接更新しない。あくまで「実行してほしい
 * 操作」を表す `AiAction` を返すだけの純粋関数にする。実際の永続化は、
 * クライアント側（`AiAssistantPanel`）が結果の `actions` を受け取り、
 * `Workspace.tsx` が既に持つ楽観的更新ハンドラ（`onAddTask`/`onUpdateTaskField`/
 * `onToggleTaskDone`）にそのまま委譲する。理由:
 *   - 永続化の経路（楽観的更新 → `app/api/**` Route Handler）を1本化でき、
 *     チャット経由の変更だけDBアクセス方法が別ルートになる事態を避けられる
 *   - タスクの削除ツールを用意しないことで「削除はAIから実行不可、手動のみ」
 *     （`docs/mock-implementation-plan.md` §2.5）という制約がそのまま守られる
 */

import { tool } from "ai";
import { z } from "zod";

import type { Member, Task } from "@/lib/schema";

export type AiAddTaskAction = {
  type: "addTask";
  title: string;
  dueDate: string;
  assigneeId: string;
  memo: string;
};

export type AiUpdateTaskAction = {
  type: "updateTask";
  taskId: string;
  patch: Partial<Pick<Task, "title" | "dueDate" | "assigneeId" | "memo">>;
};

export type AiCompleteTaskAction = {
  type: "completeTask";
  taskId: string;
  done: boolean;
};

export type AiProposeTasksAction = {
  type: "proposeTasks";
  intro: string;
  titles: string[];
};

export type AiAction =
  | AiAddTaskAction
  | AiUpdateTaskAction
  | AiCompleteTaskAction
  | AiProposeTasksAction;

type AiToolOutput = AiAction | { type: "error"; message: string };

/** モデルが渡してきた担当者指定（idまたは名前）を、既知のメンバーidに解決する。 */
function resolveAssigneeId(
  input: string | undefined,
  members: Member[],
): string {
  if (!input) return "";
  if (members.some((m) => m.id === input)) return input;
  return members.find((m) => m.name === input)?.id ?? "";
}

export function buildAiTools({
  tasks,
  members,
}: {
  tasks: Task[];
  members: Member[];
}) {
  return {
    addTask: tool({
      description: "新しいタスクを1件、プロジェクトに追加する。",
      inputSchema: z.object({
        title: z.string().min(1).describe("タスクのタイトル"),
        dueDate: z
          .string()
          .optional()
          .describe("期限（YYYY-MM-DD形式。不明なら省略）"),
        assigneeId: z
          .string()
          .optional()
          .describe("担当者のメンバーid（不明なら省略）"),
        memo: z.string().optional().describe("メモ（不明なら省略）"),
      }),
      execute: async ({ title, dueDate, assigneeId, memo }) => {
        const output: AiToolOutput = {
          type: "addTask",
          title,
          dueDate: dueDate ?? "",
          assigneeId: resolveAssigneeId(assigneeId, members),
          memo: memo ?? "",
        };
        return output;
      },
    }),

    updateTask: tool({
      description:
        "既存タスクのタイトル・期限・担当者・メモを更新する（削除はできない）。",
      inputSchema: z.object({
        taskId: z.string().describe("更新するタスクのid"),
        title: z.string().optional(),
        dueDate: z.string().optional(),
        assigneeId: z.string().optional(),
        memo: z.string().optional(),
      }),
      execute: async ({ taskId, title, dueDate, assigneeId, memo }) => {
        const target = tasks.find((t) => t.id === taskId);
        if (!target) {
          const output: AiToolOutput = {
            type: "error",
            message: `タスクid ${taskId} が見つかりません`,
          };
          return output;
        }

        const patch: AiUpdateTaskAction["patch"] = {};
        if (title !== undefined) patch.title = title;
        if (dueDate !== undefined) patch.dueDate = dueDate;
        if (assigneeId !== undefined)
          patch.assigneeId = resolveAssigneeId(assigneeId, members);
        if (memo !== undefined) patch.memo = memo;

        if (Object.keys(patch).length === 0) {
          const output: AiToolOutput = {
            type: "error",
            message: "更新項目が指定されていません",
          };
          return output;
        }

        const output: AiToolOutput = { type: "updateTask", taskId, patch };
        return output;
      },
    }),

    completeTask: tool({
      description: "タスクの完了・未完了状態を変更する。",
      inputSchema: z.object({
        taskId: z.string().describe("対象タスクのid"),
        done: z.boolean().describe("trueで完了、falseで未完了に戻す"),
      }),
      execute: async ({ taskId, done }) => {
        const target = tasks.find((t) => t.id === taskId);
        if (!target) {
          const output: AiToolOutput = {
            type: "error",
            message: `タスクid ${taskId} が見つかりません`,
          };
          return output;
        }
        const output: AiToolOutput = { type: "completeTask", taskId, done };
        return output;
      },
    }),

    proposeTasks: tool({
      description:
        "「〇〇のタスクを洗い出して」等、複数タスクの一括提案を求められたときに使う。" +
        "この時点ではまだ追加しない（ユーザーがチェックボックスで選んで確定するまで待つ）。" +
        "単発の「〇〇を追加して」には使わず、addTaskを使うこと。",
      inputSchema: z.object({
        intro: z
          .string()
          .describe(
            "提案の一言説明（例:「リリース準備に関するタスクを5件提案します」）",
          ),
        titles: z
          .array(z.string().min(1))
          .min(3)
          .max(8)
          .describe("提案するタスクタイトルの配列（3〜8件）"),
      }),
      execute: async ({ intro, titles }) => {
        const output: AiToolOutput = { type: "proposeTasks", intro, titles };
        return output;
      },
    }),
  };
}

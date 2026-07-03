/**
 * プロジェクト管理ドメインの Zod スキーマと派生型。
 * 雛形の SSoT として、UI コンポーネントはここから型をインポートする。
 *
 * 「社内のプロジェクト管理ツール」ドメイン。外部クライアントは登場せず、
 * プロジェクトは一階層の一覧として扱い、担当者は組織メンバーからアサインする
 * （自由テキストにしない）。
 */

import { z } from "zod";

// ===== 移行期間の互換型: プロジェクトカテゴリ =====

/**
 * @deprecated ステップ4-B以降、カテゴリはDB/UIともに廃止対象。
 * 4-CでPane1〜3/APIを切り替えるまでの互換用にのみ残している。
 */
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

// ===== 組織・権限 =====
// 「各組織ごとのワークスペースに分かれ、そのワークスペース内に3段階のロールが
// 存在する」という決定に基づく。ロールは Clerk 標準ロール（Owner/Admin/Member）を
// 想定した3段階固定（バックエンドフェーズで Clerk Organizations に接続）。

export const roleSchema = z.enum(["owner", "admin", "member"]);
export type Role = z.infer<typeof roleSchema>;

/**
 * 組織メンバー（ワークスペースに所属する社員）。
 * タスクの担当者アサインは、自由テキストではなくこのメンバー一覧から選択する。
 */
export const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: roleSchema,
});
export type Member = z.infer<typeof memberSchema>;

// ===== プロジェクトステータス（4 段階固定） =====
// Pane 2 のカンバン列。企画中 → 進行中 → レビュー中 → 完了 の固定 4 段階。

export const projectStatusKeySchema = z.enum([
  "planning",
  "inProgress",
  "review",
  "done",
]);
export type ProjectStatusKey = z.infer<typeof projectStatusKeySchema>;

/** Pane 2 カンバン列の表示順。空列も含め常に 4 列表示する。 */
export const STATUS_ORDER = projectStatusKeySchema.options;

// ===== タスク =====

export const taskLevelSchema = z.enum(["large", "medium", "small"]);
export type TaskLevel = z.infer<typeof taskLevelSchema>;

/**
 * プロジェクト配下のタスク。最大3段階固定（大項目 → 中項目 → 小項目）で、
 * 中項目は任意。DBは単一 `tasks` テーブルに `parentTaskId` と `level` を持つ。
 *
 * `assigneeId` は `Member.id` への参照（未アサインは空文字）で、担当者は組織
 * メンバーから選択する。
 */
export const taskSchema = z.object({
  id: z.string(),
  parentTaskId: z.string().min(1).nullable().default(null),
  level: taskLevelSchema.default("small"),
  title: z.string(),
  done: z.boolean(),
  dueDate: z.string(),
  assigneeId: z.string(),
  memo: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

// ===== プロジェクト =====

/**
 * プロジェクトの最上位データ。ステップ4-B以降、カテゴリには紐づけず Pane 1 では
 * プロジェクト名だけの一階層一覧として扱う。進捗率は配下の小項目タスクから派生計算する
 * （`lib/computed/projects.ts` の `getProjectProgress`）ため、フィールドとしては持たない。
 */
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: projectStatusKeySchema,
  deadline: z.string(),
  tasks: z.array(taskSchema),
});
export type Project = z.infer<typeof projectSchema>;

// ===== JSON 全体用スキーマ =====

export const categoriesSchema = z.array(categorySchema);
export const projectsSchema = z.array(projectSchema);
export const workspaceSchema = z.object({
  name: z.string(),
  icon: z.string(),
});

// ===== Pane 4 の表示状態（SelectedDetail） =====

/**
 * Pane 4 に「何を開いているか」を表す型。
 *
 * - `{ type: "task"; taskId }`: 選択中プロジェクトの、あるタスクの詳細を表示中
 * - `null`: タスク未選択（Pane 4 は畳み状態）
 */
export type SelectedDetail = { type: "task"; taskId: string } | null;

/** Pane 4 のタブ。「詳細」= 選択タスクの編集 / 「ai」= AI 壁打ちアシスタント。 */
export type Pane4Tab = "detail" | "ai";

/**
 * GlobalHeader のビュー切替。「workspace」= 通常の4ペイン、
 * 「dashboard」= 全体ダッシュボード（Pane2〜4を差し替える）。
 */
export type MainView = "workspace" | "dashboard";

// ===== 期限リスク（派生計算の戻り値型） =====

export type DeadlineRisk = "overdue" | "dueSoon" | "onTrack" | "none";

// ===== Pane 2 の派生計算用 UI 表示型 =====
// Workspace の派生計算 (projectGroups) と ProjectListPane の props 型として共有する。
// projects 配列から生成される表示単位。

export type ProjectRow = {
  id: string;
  name: string;
  deadline: string;
  deadlineRisk: DeadlineRisk;
  doneCount: number;
  totalCount: number;
};

/** Pane 2 のステータス別グループ表示単位。空ステータスも含め常に 4 グループ表示する。 */
export type Group = {
  status: ProjectStatusKey;
  label: string;
  items: ProjectRow[];
};

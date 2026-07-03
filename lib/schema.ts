/**
 * プロジェクト管理ドメインの Zod スキーマと派生型。
 * 雛形の SSoT として、UI コンポーネントはここから型をインポートする。
 *
 * 「社内のプロジェクト管理ツール」ドメイン。外部クライアントは登場せず、
 * 案件は社内の分類軸（カテゴリ）でグルーピングし、担当者は組織メンバーから
 * アサインする（自由テキストにしない）。
 */

import { z } from "zod";

// ===== Pane 1: プロジェクトカテゴリ =====

/** プロジェクトカテゴリ（社内の分類軸）。Pane 1 の Sidebar 最上位グループ単位。 */
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

// ===== タスク（軽量） =====

/**
 * プロジェクト配下のタスク。5 項目の最小構成（タイトル・完了フラグ・期限・担当者・メモ）。
 * 固定フェーズは持たず、自由に追加・削除できる。`assigneeId` は `Member.id` への参照
 * （未アサインは空文字）で、担当者は組織メンバーから選択する。
 */
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
  dueDate: z.string(),
  assigneeId: z.string(),
  memo: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

// ===== プロジェクト =====

/**
 * プロジェクトの最上位データ。Pane 1 の階層では `categoryId` でカテゴリに紐づき、
 * Pane 2 では `status` でカンバン列に分類される。進捗率は `tasks` から派生計算する
 * （`lib/computed/projects.ts` の `getProjectProgress`）ため、フィールドとしては持たない。
 */
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryId: z.string(),
  status: projectStatusKeySchema,
  deadline: z.string(),
  tasks: z.array(taskSchema),
});
export type Project = z.infer<typeof projectSchema>;

// ===== JSON 全体用スキーマ =====

export const categoriesSchema = z.array(categorySchema);
export const membersSchema = z.array(memberSchema);
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
  progress: number;
  deadline: string;
  deadlineRisk: DeadlineRisk;
};

/** Pane 2 のステータス別グループ表示単位。空ステータスも含め常に 4 グループ表示する。 */
export type Group = {
  status: ProjectStatusKey;
  label: string;
  items: ProjectRow[];
};

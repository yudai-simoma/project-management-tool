/**
 * 雛形の表示文言（labels）。
 *
 * プロジェクト管理ドメインの key → 日本語ラベルの単純なマッピングとして持つ。
 */

import { type ProjectStatusKey, type Role, type MainView } from "@/lib/schema";

// ===== 組織ロール（3 段階固定） =====
// 「組織 = ワークスペース」単位で所属し、その中で3段階のロールを持つ（Clerk標準ロール想定）。
// OrgSwitcher（現在の組織でのロール表示）で使用する。

export const ROLE_LABEL: Record<Role, string> = {
  owner: "オーナー",
  admin: "管理者",
  member: "メンバー",
};

// ===== プロジェクトステータス（4 段階固定） =====

export const STATUS_LABELS: Record<ProjectStatusKey, string> = {
  planning: "企画中",
  inProgress: "進行中",
  review: "レビュー中",
  done: "完了",
};

// ===== GlobalHeader のビュー切替（ワークスペース／全体ダッシュボード） =====

export const MAIN_VIEW_LABEL: Record<MainView, string> = {
  workspace: "ワークスペース",
  dashboard: "ダッシュボード",
};

export const PORTFOLIO_DASHBOARD_TITLE = "全体ダッシュボード";

// ===== Pane 3 ダッシュボードのセクション見出し =====

export const PANE3_SECTION = {
  overview: "概要",
  aiSummary: "AI進捗サマリー",
  taskList: "タスク一覧",
} as const;

// ===== Pane 4 セクション id（詳細タブ内スクロールアンカー用） =====

export const PANE4_SECTION_IDS = {
  detail: {
    info: "pane4-detail-info",
    memo: "pane4-detail-memo",
  },
} as const;

// ===== 期限リスクの表示ラベル・バッジ variant =====

export const DEADLINE_RISK_LABEL = {
  overdue: "期限超過",
  dueSoon: "期限間近",
  onTrack: "順調",
  none: "期限未設定",
} as const;

// ===== AI 進捗サマリー・AIアシスタントの固定文言 =====
// 実際の応答は Gemini（`app/api/ai/summary`・`app/api/ai/chat`）が生成するため、
// ここにはAPIキー未設定時のフォールバック等、固定文言のみを置く
// （`docs/backend-implementation-plan.md` セクション5）。

export const AI_CHAT_GREETING =
  "このプロジェクトについて、タスクの追加・編集・完了報告などお手伝いします。何をしますか？";

export const AI_NO_API_KEY_MESSAGE =
  "Gemini APIキーが未設定です。画面右上のユーザーメニュー「Gemini APIキー設定」から、あなた個人のAPIキーを登録してください。登録すると、実際のAIによる進捗サマリー・壁打ちアシスタントが利用できます。";

export const AI_CHAT_ERROR_MESSAGE =
  "AIアシスタントの呼び出しに失敗しました。時間を置いて再度お試しください。";

export const AI_SUMMARY_ERROR_MESSAGE =
  "AI進捗サマリーの取得に失敗しました。時間を置いて更新してください。";

// ===== ロールに基づく操作制限の案内文言（`docs/backend-implementation-plan.md` セクション6） =====

export const MANAGE_ROLE_TOOLTIP = "この操作はOwner/Adminのみ実行できます";

export const TASK_DELETE_ROLE_TOOLTIP =
  "このタスクの担当者、またはOwner/Adminのみ削除できます";

export const SELF_REMOVE_TOOLTIP = "自分自身を組織から削除することはできません";

export const LAST_OWNER_TOOLTIP = "組織には最低1名のOwnerが必要です";

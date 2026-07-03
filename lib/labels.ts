/**
 * 雛形の表示文言（labels）。
 *
 * プロジェクト管理ドメインの key → 日本語ラベルの単純なマッピングとして持つ。
 */

import {
  type ProjectStatusKey,
  type DeadlineRisk,
  type Role,
  type MainView,
} from "@/lib/schema";

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

// ===== AI 進捗サマリーのダミーテンプレート文（モック段階、実LLM呼び出しなし） =====
// 実際の Gemini API 接続は次フェーズ。ここでは期限リスクからテンプレート文を組み立てる。
// 各リスクにつき複数バリエーションを持たせ、Pane 3 の「更新」ボタンで
// ランダムに差し替えられるようにしている（実LLM呼び出しの代替演出）。

export const AI_SUMMARY_TEMPLATES: Record<
  DeadlineRisk,
  ((name: string) => string)[]
> = {
  overdue: [
    (name) =>
      `⚠️「${name}」は期限を過ぎています。至急、担当タスクの進捗を確認してください。`,
    (name) =>
      `⚠️「${name}」の期限超過が続いています。担当者に状況をヒアリングし、リカバリ計画を立てましょう。`,
  ],
  dueSoon: [
    (name) =>
      `「${name}」は期限が近づいています。残タスクの優先順位を見直しましょう。`,
    (name) =>
      `「${name}」の期限まで残りわずかです。未完了タスクの担当者に進捗を確認してください。`,
  ],
  onTrack: [
    (name) => `「${name}」は順調に進んでいます。特に懸念はありません。`,
    (name) =>
      `「${name}」は計画通り進行中です。このままのペースを維持しましょう。`,
  ],
  none: [
    (name) =>
      `「${name}」には期限が設定されていません。期限を設定するとリスク判定が行えます。`,
    (name) =>
      `「${name}」の期限が未設定です。概要ヘッダー帯から設定してください。`,
  ],
};

// ===== AI アシスタント（壁打ちチャット）のダミー応答用文言 =====

export const AI_CHAT_GREETING =
  "このプロジェクトについて、タスクの追加・編集・完了報告などお手伝いします。何をしますか？";

export const AI_CHAT_FALLBACK =
  "（モックのため簡易応答です）タスクの追加は「〇〇を追加して」、完了報告は「〇〇を完了にして」、複数タスクの洗い出しは「〇〇のタスクを洗い出して」のように話しかけてください。";

// ===== AI タスク洗い出し（複数タスク一括提案、モック段階のダミーロジック） =====
// 実際の Gemini API 接続は次フェーズ。ここでは固定の候補リストを、トピック
// （「〇〇のタスクを洗い出して」の〇〇部分）でプレフィックスして返す簡易ロジック。

const AI_TASK_PROPOSAL_BASE_TITLES = [
  "要件を整理する",
  "スケジュールを作成する",
  "関係者に共有する",
  "進捗確認ミーティングを設定する",
  "成果物をレビューする",
];

/** トピックが指定されていればタイトルにプレフィックスして返す純関数。 */
export function buildAiTaskProposalTitles(topic?: string): string[] {
  const trimmed = topic?.trim();
  if (!trimmed) return AI_TASK_PROPOSAL_BASE_TITLES;
  return AI_TASK_PROPOSAL_BASE_TITLES.map((title) => `${trimmed}: ${title}`);
}

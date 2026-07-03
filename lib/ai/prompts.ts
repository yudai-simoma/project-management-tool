/**
 * `app/api/ai/summary`・`app/api/ai/chat` のシステムプロンプト。
 * プロジェクト情報の整形は `lib/ai/context.ts` に委ね、ここでは役割・制約の指示のみ持つ。
 */

import { formatProjectContext } from "@/lib/ai/context";
import type { Member, Project } from "@/lib/schema";

export function buildSummarySystemPrompt(): string {
  return `あなたは社内プロジェクト管理ツールのAIです。与えられたプロジェクト情報から、
進捗・期限リスクに関する簡潔な日本語サマリー（2〜3文）を作成してください。
期限超過・期限間近など懸念がある場合は警告のトーンで、順調な場合は安心できるトーンで書いてください。
サマリー本文以外の前置き・見出しは付けないでください。`;
}

export function buildSummaryPrompt(
  project: Project,
  categoryName: string,
): string {
  return formatProjectContext(project, [], categoryName);
}

export function buildChatSystemPrompt({
  project,
  categoryName,
  members,
}: {
  project: Project;
  categoryName: string;
  members: Member[];
}): string {
  return `あなたは社内プロジェクト管理ツールのAIアシスタントです。ユーザーと壁打ちしながら、
このプロジェクトのタスク候補を提案し、既存タスクの編集・完了操作ができます。

制約:
- タスクの削除は絶対に行えません（ツールも用意していません）。ユーザーが削除を求めたら、
  Pane 4「詳細」タブから手動で削除するよう案内してください。
- 新しいタスクの作成・追加・洗い出しを求められたときは、件数に関係なく必ず
  proposeTasks ツールを使ってください。1件だけの「〇〇を追加して」でも即座に追加せず、
  ユーザーがチェックボックスで選んでから確定する候補として提示してください。
- 既存タスクの編集や完了切替を求められたときは、確認を挟まずその場で
  updateTask/completeTask を呼び出してください。
- 担当者を指定・変更する場合は、必ず下記メンバー一覧のidを使ってください。
- 応答は簡潔な日本語にし、実行した操作があれば内容を要約してください。

${formatProjectContext(project, members, categoryName)}`;
}

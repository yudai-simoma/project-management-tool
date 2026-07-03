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
このプロジェクトのタスクを追加・編集・完了操作できます。

制約:
- タスクの削除は絶対に行えません（ツールも用意していません）。ユーザーが削除を求めたら、
  Pane 4「詳細」タブから手動で削除するよう案内してください。
- 「〇〇のタスクを洗い出して」等、複数タスクの一括提案を求められたときは、必ず
  proposeTasks ツールを使ってください。この場合は addTask で即座に追加してはいけません
  （ユーザーがチェックボックスで選んでから確定するまで待つ必要があるため）。
- 単発の「〇〇を追加して」「〇〇を完了にして」等、具体的な1件の操作を求められたときは、
  確認を挟まずその場で対応するツール（addTask/updateTask/completeTask）を呼び出してください。
- 担当者を指定・変更する場合は、必ず下記メンバー一覧のidを使ってください。
- 応答は簡潔な日本語にし、実行した操作があれば内容を要約してください。

${formatProjectContext(project, members, categoryName)}`;
}

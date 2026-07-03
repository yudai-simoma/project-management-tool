"use client";

/**
 * Pane 4: プロジェクト詳細パネル（タブ切替式）。
 *
 * 「詳細」タブ = 選択中タスクの自由編集（タイトル・完了・期限・担当者・メモ、
 * 削除は手動のみ）、「AIアシスタント」タブ = 壁打ちチャットでタスクの追加・完了を
 * 実行できるダミー応答チャット（実Gemini API呼び出しは次フェーズ）。
 *
 * 規律:
 *   - components/primitives/ の Inline* primitive を使う（shadcn 標準フォーム）
 *   - タスク切替時の state リセットは `key` 再マウントで
 *   - Pane 4 の開閉制御（Pane4Toggle）は既存パターンをそのまま流用
 *
 * `docs/mock-implementation-plan.md` §6.2 の設計方針に基づく実装。
 */

import { useEffect, useState } from "react";
import { Send, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";
import { Pane4Section } from "@/components/workspace/Pane4Section";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";

import {
  type Task,
  type Project,
  type Member,
  type SelectedDetail,
  type Pane4Tab,
} from "@/lib/schema";
import {
  PANE4_SECTION_IDS,
  AI_CHAT_GREETING,
  AI_CHAT_FALLBACK,
  buildAiTaskProposalTitles,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  InlineTextField,
  InlineDateField,
  InlineSelectField,
  InlineTextareaField,
  InlineFieldRow,
} from "@/components/primitives";

// ===== Pane 4 内部型（ファイル外には出さない） =====

/**
 * 「詳細」タブで inline 編集できる Task のキー集合。
 * `onUpdateTaskField` の `field` 引数の型として親 (Workspace.tsx) と整合させる。
 * `done` は Checkbox 専用の `onToggleTaskDone` で扱うためここには含めない。
 */
type EditableTaskKey = "title" | "dueDate" | "assigneeId" | "memo";

/**
 * AI アシスタントのチャットメッセージ。永続化しないためこのファイルにのみ閉じる。
 *
 * - "text": 通常の吹き出し（従来通り）
 * - "taskProposal": 「〇〇のタスクを洗い出して」への応答。複数のタスク候補を
 *   チェックボックスで提示し、選択したものだけ「追加」ボタンで確定する
 *   （確認ステップを挟む、§10 決定）。
 */
type TaskProposal = { id: string; title: string; checked: boolean };

type ChatMessage =
  | { id: string; role: "user" | "assistant"; kind: "text"; content: string }
  | {
      id: string;
      role: "assistant";
      kind: "taskProposal";
      intro: string;
      proposals: TaskProposal[];
      confirmed: boolean;
    };

// ===== 担当者フィールド用ラベル =====
// 担当者は組織メンバー一覧（`Member[]`）から選択する（自由テキストにしない）。

const UNASSIGNED_LABEL = "未アサイン";

// ===== 「詳細」タブ: 選択中タスクの編集 =====

function TaskDetailContent({
  task,
  members,
  onUpdateField,
  onToggleDone,
  onRequestDelete,
}: {
  task: Task;
  members: Member[];
  onUpdateField: (field: EditableTaskKey, value: string) => void;
  onToggleDone: () => void;
  onRequestDelete: () => void;
}) {
  const assigneeOptions = [UNASSIGNED_LABEL, ...members.map((m) => m.name)];
  const currentAssigneeName =
    members.find((m) => m.id === task.assigneeId)?.name ?? UNASSIGNED_LABEL;

  const handleAssigneeChange = (name: string) => {
    const member = members.find((m) => m.name === name);
    onUpdateField("assigneeId", member?.id ?? "");
  };

  return (
    <div>
      <Pane4Section id={PANE4_SECTION_IDS.detail.info} title="基本情報">
        <dl className="flex flex-col gap-2.5 text-sm">
          <InlineFieldRow label="タイトル">
            <InlineTextField
              value={task.title}
              onSave={(v) => onUpdateField("title", v)}
              ariaLabel="タイトル"
            />
          </InlineFieldRow>

          <InlineFieldRow label="完了">
            <div className="flex h-8 items-center gap-2">
              <Checkbox
                checked={task.done}
                onCheckedChange={onToggleDone}
                aria-label="完了"
              />
              <span className="text-sm text-muted-foreground">
                {task.done ? "完了" : "未完了"}
              </span>
            </div>
          </InlineFieldRow>

          <InlineFieldRow label="期限">
            <InlineDateField
              value={task.dueDate}
              onSave={(v) => onUpdateField("dueDate", v)}
              ariaLabel="期限"
            />
          </InlineFieldRow>

          <InlineFieldRow label="担当者">
            <InlineSelectField
              value={currentAssigneeName}
              options={assigneeOptions}
              onSave={handleAssigneeChange}
              ariaLabel="担当者"
              placeholder={UNASSIGNED_LABEL}
            />
          </InlineFieldRow>
        </dl>
      </Pane4Section>

      <Separator />

      <Pane4Section
        id={PANE4_SECTION_IDS.detail.memo}
        title="メモ"
        className="gap-2"
      >
        <InlineTextareaField
          value={task.memo}
          onSave={(v) => onUpdateField("memo", v)}
          ariaLabel="メモ"
        />
      </Pane4Section>

      <Separator />

      <div className="px-5 py-4">
        <Button
          type="button"
          variant="destructive"
          onClick={onRequestDelete}
          className="w-full"
        >
          <Trash2 data-icon="inline-start" />
          タスクを削除
        </Button>
      </div>
    </div>
  );
}

// ===== 「AIアシスタント」タブ: 壁打ちチャット（ダミー応答） =====

function ChatBubble({
  message,
}: {
  message: Extract<ChatMessage, { kind: "text" }>;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-line",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {message.content}
      </p>
    </div>
  );
}

/**
 * 「タスクを洗い出して」への応答バブル。複数タスクをチェックボックスで提示し、
 * 選択したものだけ「追加」ボタンで確定する（確認ステップあり、§10 決定）。
 * 確定後はチェックボックス・ボタンを disabled にし、再確定できないようにする。
 */
function TaskProposalBubble({
  message,
  onToggleProposal,
  onConfirm,
}: {
  message: Extract<ChatMessage, { kind: "taskProposal" }>;
  onToggleProposal: (proposalId: string) => void;
  onConfirm: () => void;
}) {
  const checkedCount = message.proposals.filter((p) => p.checked).length;

  return (
    <div className="flex justify-start">
      <div className="flex w-[85%] flex-col gap-2 rounded-lg bg-muted px-3 py-2 text-foreground">
        <p className="text-sm leading-relaxed whitespace-pre-line">
          {message.intro}
        </p>
        <ul className="flex flex-col gap-0.5">
          {message.proposals.map((proposal) => (
            <li key={proposal.id}>
              <label
                className={cn(
                  "flex items-center gap-2 rounded-md px-1 py-1 text-sm",
                  !message.confirmed && "cursor-pointer hover:bg-background/60",
                )}
              >
                <Checkbox
                  checked={proposal.checked}
                  onCheckedChange={() => onToggleProposal(proposal.id)}
                  disabled={message.confirmed}
                  aria-label={proposal.title}
                />
                <span
                  className={cn(
                    message.confirmed &&
                      proposal.checked &&
                      "text-muted-foreground",
                  )}
                >
                  {proposal.title}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {message.confirmed ? (
          <p className="text-xs text-muted-foreground">追加済みです。</p>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onConfirm}
            disabled={checkedCount === 0}
            className="self-start"
          >
            選択した{checkedCount}件を追加
          </Button>
        )}
      </div>
    </div>
  );
}

function AiAssistantPanel({
  project,
  onAddTask,
  onToggleTaskDone,
}: {
  project: Project;
  onAddTask: (title: string) => void;
  onToggleTaskDone: (taskId: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "greeting", role: "assistant", kind: "text", content: AI_CHAT_GREETING },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      kind: "text",
      content: text,
    };

    // 「〇〇のタスクを洗い出して」: 複数タスクを一括提案する（優先して判定する）。
    const surveyMatch = text.match(/^(?:(.+?)の)?タスクを?洗い出/);
    // 「〇〇を追加して」「〇〇を完了にして」: 単発の即時実行パターン（従来通り）。
    const addMatch = text.match(/^(.+?)を追加(?:して)?$/);
    const doneMatch = text.match(/^(.+?)を完了(?:に)?(?:して)?$/);

    if (surveyMatch) {
      const topic = surveyMatch[1]?.trim();
      const titles = buildAiTaskProposalTitles(topic);
      const proposalMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        kind: "taskProposal",
        intro: topic
          ? `「${topic}」に関するタスクを${titles.length}件提案します。追加するものを選んでください。`
          : `タスクを${titles.length}件提案します。追加するものを選んでください。`,
        proposals: titles.map((title, idx) => ({
          id: `p-${Date.now()}-${idx}`,
          title,
          checked: true,
        })),
        confirmed: false,
      };
      setMessages((prev) => [...prev, userMessage, proposalMessage]);
      setInput("");
      return;
    }

    let replyContent = AI_CHAT_FALLBACK;
    if (addMatch?.[1]?.trim()) {
      const title = addMatch[1].trim();
      onAddTask(title);
      replyContent = `「${title}」を追加しました。`;
    } else if (doneMatch?.[1]?.trim()) {
      const name = doneMatch[1].trim();
      const target = project.tasks.find((t) => t.title.includes(name));
      if (target) {
        if (!target.done) onToggleTaskDone(target.id);
        replyContent = `「${target.title}」を完了にしました。`;
      } else {
        replyContent = `「${name}」に一致するタスクが見つかりませんでした。`;
      }
    }

    const assistantMessage: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      kind: "text",
      content: replyContent,
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
  };

  // 提案メッセージ内のチェックボックス切替。
  const handleToggleProposal = (messageId: string, proposalId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.kind === "taskProposal"
          ? {
              ...m,
              proposals: m.proposals.map((p) =>
                p.id === proposalId ? { ...p, checked: !p.checked } : p,
              ),
            }
          : m,
      ),
    );
  };

  // 提案の確定。setMessages の関数更新の外で onAddTask を呼び、
  // React の二重実行によるタスク重複追加を避ける。
  const handleConfirmProposal = (messageId: string) => {
    const target = messages.find((m) => m.id === messageId);
    if (!target || target.kind !== "taskProposal" || target.confirmed) return;

    const checkedTitles = target.proposals
      .filter((p) => p.checked)
      .map((p) => p.title);
    checkedTitles.forEach(onAddTask);

    const resultMessage: ChatMessage = {
      // messageId は提案メッセージごとに一意なので、それ由来の固定文字列で
      // 一意性を確保する（confirm は1メッセージにつき1回しか実行されない）。
      id: `${messageId}-result`,
      role: "assistant",
      kind: "text",
      content:
        checkedTitles.length > 0
          ? `${checkedTitles.length}件のタスクを追加しました。`
          : "タスクは追加されませんでした。",
    };
    setMessages((prev) => [
      ...prev.map((m) => (m.id === messageId ? { ...m, confirmed: true } : m)),
      resultMessage,
    ]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-4 py-4">
          {messages.map((m) =>
            m.kind === "taskProposal" ? (
              <TaskProposalBubble
                key={m.id}
                message={m}
                onToggleProposal={(proposalId) =>
                  handleToggleProposal(m.id, proposalId)
                }
                onConfirm={() => handleConfirmProposal(m.id)}
              />
            ) : (
              <ChatBubble key={m.id} message={m} />
            ),
          )}
        </div>
      </ScrollArea>
      <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="例:「タスクを洗い出して」"
          aria-label="AIアシスタントへのメッセージ"
          className="h-8 bg-card"
        />
        <Button
          type="button"
          size="icon-sm"
          onClick={handleSend}
          disabled={!input.trim()}
          aria-label="送信"
        >
          <Send />
        </Button>
      </div>
    </div>
  );
}

// ===== Pane 4 メイン =====

export function ProjectDetailPane({
  selectedProjectId,
  project,
  members,
  selectedDetail,
  scrollAnchor,
  onScrollAnchorConsumed,
  onUpdateTaskField,
  onToggleTaskDone,
  onDeleteTask,
  onAddTask,
  pane4Open,
  onTogglePane4,
  pane4Tab,
  onPane4TabChange,
}: {
  selectedProjectId: string;
  project: Project;
  members: Member[];
  selectedDetail: SelectedDetail;
  scrollAnchor: string | null;
  onScrollAnchorConsumed: () => void;
  onUpdateTaskField: (
    taskId: string,
    field: EditableTaskKey,
    value: string,
  ) => void;
  onToggleTaskDone: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (title: string) => void;
  pane4Open: boolean;
  onTogglePane4: () => void;
  pane4Tab: Pane4Tab;
  onPane4TabChange: (tab: Pane4Tab) => void;
}) {
  const [deleteRequested, setDeleteRequested] = useState(false);

  useEffect(() => {
    if (!scrollAnchor) return;
    const id = requestAnimationFrame(() => {
      document
        .getElementById(scrollAnchor)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
      onScrollAnchorConsumed();
    });
    return () => cancelAnimationFrame(id);
  }, [scrollAnchor, onScrollAnchorConsumed]);

  const selectedTask =
    selectedDetail?.type === "task"
      ? project.tasks.find((t) => t.id === selectedDetail.taskId)
      : undefined;

  const heading = selectedTask ? selectedTask.title : "タスク詳細";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border bg-background",
        "overflow-hidden transition-[width] duration-200 ease-linear",
        pane4Open ? "w-[400px]" : "w-12",
      )}
    >
      {pane4Open ? (
        <Tabs
          value={pane4Tab}
          onValueChange={(v) => onPane4TabChange(v as Pane4Tab)}
          className="flex h-full min-h-0 flex-col gap-0"
        >
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <TabsList className="min-w-0">
              <TabsTrigger value="detail">詳細</TabsTrigger>
              <TabsTrigger value="ai">AIアシスタント</TabsTrigger>
            </TabsList>
            <span className="sr-only">{heading}</span>
            <Pane4Toggle
              open={pane4Open}
              onToggle={onTogglePane4}
              className="ml-auto"
            />
          </header>

          <TabsContent value="detail" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              {selectedTask ? (
                <TaskDetailContent
                  key={`${selectedProjectId}-${selectedTask.id}`}
                  task={selectedTask}
                  members={members}
                  onUpdateField={(field, value) =>
                    onUpdateTaskField(selectedTask.id, field, value)
                  }
                  onToggleDone={() => onToggleTaskDone(selectedTask.id)}
                  onRequestDelete={() => setDeleteRequested(true)}
                />
              ) : (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Pane 3 でタスクを選択してください
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai" className="min-h-0 flex-1">
            <AiAssistantPanel
              key={selectedProjectId}
              project={project}
              onAddTask={onAddTask}
              onToggleTaskDone={onToggleTaskDone}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-border">
          <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
        </div>
      )}

      {selectedTask && (
        <DeleteConfirmDialog
          open={deleteRequested}
          onOpenChange={setDeleteRequested}
          title="タスクを削除しますか？"
          itemName={selectedTask.title}
          onConfirm={() => {
            onDeleteTask(selectedTask.id);
            setDeleteRequested(false);
          }}
        />
      )}
    </aside>
  );
}

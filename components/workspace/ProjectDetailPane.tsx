"use client";

/**
 * Pane 4: プロジェクト詳細パネル（タブ切替式）。
 *
 * 「詳細」タブ = 選択中タスクの自由編集（タイトル・完了・期限・担当者・メモ、
 * 削除は手動のみ）、「AIアシスタント」タブ = 壁打ちチャットでタスクの追加・編集・完了を
 * 実行できる（実Gemini API呼び出し、tool calling。削除はAIから実行不可、手動のみ）。
 *
 * 規律:
 *   - components/primitives/ の Inline* primitive を使う（shadcn 標準フォーム）
 *   - タスク切替時の state リセットは `key` 再マウントで
 *   - Pane 4 の開閉制御（Pane4Toggle）は既存パターンをそのまま流用
 *
 * `docs/mock-implementation-plan.md` §6.2、`docs/backend-implementation-plan.md`
 * セクション5 の設計方針に基づく実装。
 */

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
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
  AI_CHAT_ERROR_MESSAGE,
  TASK_DELETE_ROLE_TOOLTIP,
} from "@/lib/labels";
import { canDeleteTask as checkCanDeleteTask } from "@/lib/auth/permissions";
import { sendAiChatMessage, type AiChatUsage } from "@/lib/api/ai-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

export type ProjectAiChatMessage =
  | { id: string; role: "user" | "assistant"; kind: "text"; content: string }
  | {
      id: string;
      role: "assistant";
      kind: "taskProposal";
      intro: string;
      proposals: TaskProposal[];
      confirmed: boolean;
    };

export type ProjectAiChatModel = {
  id: string;
  maxContextTokens: number;
};

// ===== 担当者フィールド用ラベル =====
// 担当者は組織メンバー一覧（`Member[]`）から選択する（自由テキストにしない）。

const UNASSIGNED_LABEL = "未アサイン";

// ===== 「詳細」タブ: 選択中タスクの編集 =====

function TaskDetailContent({
  task,
  members,
  canDelete,
  onUpdateField,
  onToggleDone,
  onRequestDelete,
}: {
  task: Task;
  members: Member[];
  canDelete: boolean;
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="destructive"
                disabled={!canDelete}
                onClick={onRequestDelete}
                className="w-full"
              >
                <Trash2 data-icon="inline-start" />
                タスクを削除
              </Button>
            }
          />
          {!canDelete && (
            <TooltipContent side="top">
              {TASK_DELETE_ROLE_TOOLTIP}
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );
}

// ===== 「AIアシスタント」タブ: 壁打ちチャット（Gemini + tool calling） =====

function ChatBubble({
  message,
}: {
  message: Extract<ProjectAiChatMessage, { kind: "text" }>;
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
  message: Extract<ProjectAiChatMessage, { kind: "taskProposal" }>;
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
  categoryName,
  members,
  messages,
  onMessagesChange,
  tokenUsageTotal,
  model,
  onUsageReceived,
  onAddTask,
  onUpdateTaskField,
  onToggleTaskDone,
}: {
  project: Project;
  categoryName: string;
  members: Member[];
  messages: ProjectAiChatMessage[];
  onMessagesChange: Dispatch<SetStateAction<ProjectAiChatMessage[]>>;
  tokenUsageTotal: number;
  model: ProjectAiChatModel;
  onUsageReceived: (
    usage: AiChatUsage | null,
    model: ProjectAiChatModel,
  ) => void;
  onAddTask: (
    title: string,
    extra?: Partial<Pick<Task, "dueDate" | "assigneeId" | "memo">>,
  ) => void;
  onUpdateTaskField: (
    taskId: string,
    field: EditableTaskKey,
    value: string,
  ) => void;
  onToggleTaskDone: (taskId: string) => void;
}) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const maxContextTokens = Math.max(1, model.maxContextTokens);
  const tokenPercent = Math.min(
    100,
    (tokenUsageTotal / maxContextTokens) * 100,
  );
  const formattedTokenUsage = tokenUsageTotal.toLocaleString("ja-JP");
  const formattedMaxContext = maxContextTokens.toLocaleString("ja-JP");
  const formattedTokenPercent = tokenPercent.toFixed(tokenPercent < 1 ? 2 : 1);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || pending) return;

    const userMessage: ProjectAiChatMessage = {
      id: `u-${crypto.randomUUID()}`,
      role: "user",
      kind: "text",
      content: text,
    };
    const history = messages.map((m) => ({
      role: m.role,
      content: m.kind === "text" ? m.content : `(タスク提案: ${m.intro})`,
    }));
    onMessagesChange((prev) => [...prev, userMessage]);
    setInput("");
    setPending(true);

    try {
      const res = await sendAiChatMessage({
        project,
        categoryName,
        members,
        history,
        message: text,
      });

      onUsageReceived(res.usage, res.model);

      const replyMessage: ProjectAiChatMessage =
        res.reply.kind === "taskProposal"
          ? {
              id: `a-${crypto.randomUUID()}`,
              role: "assistant",
              kind: "taskProposal",
              intro: res.reply.intro,
              proposals: res.reply.titles.map((title) => ({
                id: crypto.randomUUID(),
                title,
                checked: true,
              })),
              confirmed: false,
            }
          : {
              id: `a-${crypto.randomUUID()}`,
              role: "assistant",
              kind: "text",
              content: res.reply.content,
            };
      onMessagesChange((prev) => [...prev, replyMessage]);

      // 実行アクション（追加・編集・完了）は、既存の楽観的更新ハンドラにそのまま委譲する
      // （チャット経由の変更だけ別の永続化経路にしない、`lib/ai/tools.ts` 参照）。
      for (const action of res.actions) {
        if (action.type === "updateTask") {
          for (const [field, value] of Object.entries(action.patch)) {
            if (value !== undefined) {
              onUpdateTaskField(action.taskId, field as EditableTaskKey, value);
            }
          }
        } else if (action.type === "completeTask") {
          const target = project.tasks.find((t) => t.id === action.taskId);
          if (target && target.done !== action.done) {
            onToggleTaskDone(action.taskId);
          }
        }
      }
    } catch (error) {
      console.error("[ai] チャットの送信に失敗しました", error);
      onMessagesChange((prev) => [
        ...prev,
        {
          id: `a-${crypto.randomUUID()}`,
          role: "assistant",
          kind: "text",
          content: AI_CHAT_ERROR_MESSAGE,
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  // 提案メッセージ内のチェックボックス切替。
  const handleToggleProposal = (messageId: string, proposalId: string) => {
    onMessagesChange((prev) =>
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
    checkedTitles.forEach((title) => onAddTask(title));

    const resultMessage: ProjectAiChatMessage = {
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
    onMessagesChange((prev) => [
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
          {pending && (
            <div className="flex justify-start">
              <p className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                考え中…
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>コンテキスト</span>
            <span className="ml-auto tabular-nums">
              {formattedTokenUsage} / {formattedMaxContext} トークン (
              {formattedTokenPercent}%)
            </span>
          </div>
          <Progress value={tokenPercent} aria-label="AIコンテキスト使用率" />
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="例:「タスクを洗い出して」"
            aria-label="AIアシスタントへのメッセージ"
            disabled={pending}
            rows={2}
            className="max-h-32 min-h-16 resize-none bg-card"
          />
          <Button
            type="button"
            size="icon-sm"
            onClick={() => void handleSend()}
            disabled={!input.trim() || pending}
            aria-label="送信"
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===== Pane 4 メイン =====

export function ProjectDetailPane({
  selectedProjectId,
  project,
  categoryName,
  members,
  aiMessages,
  aiTokenUsageTotal,
  aiModel,
  selectedDetail,
  scrollAnchor,
  onScrollAnchorConsumed,
  onAiMessagesChange,
  onAiUsageReceived,
  onClearAiChat,
  onUpdateTaskField,
  onToggleTaskDone,
  onDeleteTask,
  onAddTask,
  canManageOrg,
  currentUserId,
  pane4Open,
  onTogglePane4,
  pane4Tab,
  onPane4TabChange,
}: {
  selectedProjectId: string;
  project: Project;
  categoryName: string;
  members: Member[];
  aiMessages: ProjectAiChatMessage[];
  aiTokenUsageTotal: number;
  aiModel: ProjectAiChatModel;
  selectedDetail: SelectedDetail;
  scrollAnchor: string | null;
  onScrollAnchorConsumed: () => void;
  onAiMessagesChange: Dispatch<SetStateAction<ProjectAiChatMessage[]>>;
  onAiUsageReceived: (
    usage: AiChatUsage | null,
    model: ProjectAiChatModel,
  ) => void;
  onClearAiChat: () => void;
  onUpdateTaskField: (
    taskId: string,
    field: EditableTaskKey,
    value: string,
  ) => void;
  onToggleTaskDone: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (
    title: string,
    extra?: Partial<Pick<Task, "dueDate" | "assigneeId" | "memo">>,
  ) => void;
  /** Owner/Admin かどうか（§6決定。タスク削除は担当者本人にも許可する）。 */
  canManageOrg: boolean;
  currentUserId: string;
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
            <div className="ml-auto flex items-center gap-1">
              {pane4Tab === "ai" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearAiChat}
                  disabled={aiMessages.length === 0 && aiTokenUsageTotal === 0}
                >
                  クリア
                </Button>
              )}
              <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
            </div>
          </header>

          <TabsContent value="detail" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              {selectedTask ? (
                <TaskDetailContent
                  key={`${selectedProjectId}-${selectedTask.id}`}
                  task={selectedTask}
                  members={members}
                  canDelete={checkCanDeleteTask(
                    canManageOrg,
                    currentUserId,
                    selectedTask.assigneeId,
                  )}
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
              project={project}
              categoryName={categoryName}
              members={members}
              messages={aiMessages}
              onMessagesChange={onAiMessagesChange}
              tokenUsageTotal={aiTokenUsageTotal}
              model={aiModel}
              onUsageReceived={onAiUsageReceived}
              onAddTask={onAddTask}
              onUpdateTaskField={onUpdateTaskField}
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

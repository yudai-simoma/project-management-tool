"use client";

/**
 * Pane 3: プロジェクトダッシュボード。
 *
 * 構成順序: ①概要ヘッダー帯（Collapsible） → ②AI進捗サマリーカード → ③タスク一覧カード。
 * 「Pane 3 = 読む場所、Pane 4 = 編集の本拠地」の原則に従い、進捗率は自動計算値の
 * 表示のみ（手入力不可）。タスクの完了チェックだけは Pane 3 で完結する軽量操作として
 * 許可し、それ以外のタスク編集（期限・担当者・メモ・削除）は Pane 4 に委ねる。
 *
 * `docs/mock-implementation-plan.md` §6.1 の設計方針に基づく実装。
 */

import { useState } from "react";
import { ArrowUpRight, ChevronDown, Plus, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type Project,
  type Task,
  type Member,
  type SelectedDetail,
} from "@/lib/schema";
import {
  PANE3_SECTION,
  PANE4_SECTION_IDS,
  AI_SUMMARY_TEMPLATES,
} from "@/lib/labels";
import {
  getProjectProgress,
  deriveDeadlineRisk,
  getTaskCounts,
} from "@/lib/computed/projects";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { InlineDateField, InlineFieldRow } from "@/components/primitives";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";

// ===== ↗ ジャンプアイコン（Pane 4 への導線、常時表示。ADR-0014 §4 の規律を踏襲） =====

function JumpIcon({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <ArrowUpRight
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0",
        selected ? "text-primary" : "text-muted-foreground",
        className,
      )}
    />
  );
}

// ===== Card: 概要ヘッダー帯（Collapsible、旧 ApplicationInfoCard パターンを踏襲） =====

function OverviewCard({
  project,
  categoryName,
  open,
  onOpenChange,
  onUpdateDeadline,
}: {
  project: Project;
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateDeadline: (deadline: string) => void;
}) {
  const progress = getProjectProgress(project);
  const { done, total } = getTaskCounts(project);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          nativeButton={false}
          render={
            <CardHeader className="group/trigger cursor-pointer rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          }
        >
          <CardTitle>{project.name}</CardTitle>
          <CardDescription>{categoryName}</CardDescription>
          <CardAction>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-[color,transform] group-hover/trigger:text-foreground in-data-[panel-open]:rotate-180"
            />
            <span className="sr-only">{`${PANE3_SECTION.overview}を開く`}</span>
          </CardAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <dl className="flex flex-col gap-2.5 text-sm">
              <InlineFieldRow label="期限">
                <InlineDateField
                  value={project.deadline}
                  onSave={onUpdateDeadline}
                  ariaLabel="期限"
                />
              </InlineFieldRow>
              <InlineFieldRow label="進捗率">
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {progress}%（{done}/{total}）
                  </span>
                </div>
              </InlineFieldRow>
            </dl>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ===== Card: AI進捗サマリー（モック段階のダミーロジック、実LLM呼び出しなし） =====

function AiSummaryCard({ project }: { project: Project }) {
  const risk = deriveDeadlineRisk(project.deadline);
  const templates = AI_SUMMARY_TEMPLATES[risk];
  const [templateIndex, setTemplateIndex] = useState(0);

  const handleRefresh = () => {
    if (templates.length <= 1) return;
    setTemplateIndex((prev) => {
      const next = Math.floor(Math.random() * (templates.length - 1));
      return next >= prev ? next + 1 : next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle emphasis="prominent">{PANE3_SECTION.aiSummary}</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleRefresh}
            aria-label="AI進捗サマリーを更新"
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90">
          {templates[templateIndex](project.name)}
        </p>
      </CardContent>
    </Card>
  );
}

// ===== Card: タスク一覧 =====

function TaskListCard({
  tasks,
  members,
  selectedDetail,
  onOpenDetail,
  onToggleDone,
  onAddTask,
}: {
  tasks: Task[];
  members: Member[];
  selectedDetail: SelectedDetail;
  onOpenDetail: (next: SelectedDetail, scrollAnchor?: string) => void;
  onToggleDone: (taskId: string) => void;
  onAddTask: (title: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle emphasis="prominent">{PANE3_SECTION.taskList}</CardTitle>
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setAddOpen(true)}
              aria-label="タスクを追加"
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              タスクがありません
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {tasks.map((task, idx) => {
                const selected =
                  selectedDetail?.type === "task" &&
                  selectedDetail.taskId === task.id;
                const assigneeName = members.find(
                  (m) => m.id === task.assigneeId,
                )?.name;
                return (
                  <div key={task.id}>
                    {idx > 0 && <Separator className="my-1" />}
                    <div
                      className={cn(
                        "flex items-start gap-3 rounded-md px-2 py-2 transition-colors",
                        selected
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={task.done}
                        onCheckedChange={() => onToggleDone(task.id)}
                        aria-label={`${task.title} を完了にする`}
                        className="mt-0.5"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onOpenDetail(
                            { type: "task", taskId: task.id },
                            PANE4_SECTION_IDS.detail.info,
                          )
                        }
                        aria-label={`Pane 4 で ${task.title} を開く`}
                        className="flex min-w-0 flex-1 flex-col gap-1 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <span
                          className={cn(
                            "text-sm font-medium text-foreground",
                            task.done && "text-muted-foreground line-through",
                          )}
                        >
                          {task.title}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {assigneeName ?? "未アサイン"}
                          {task.dueDate && ` · ${task.dueDate}`}
                        </p>
                      </button>
                      <JumpIcon selected={selected} className="mt-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="タスクを追加"
        description="新しいタスクを追加します"
        fieldLabel="タスク名"
        fieldId="task-title"
        placeholder="例: 原稿ライティング"
        onAdd={onAddTask}
      />
    </>
  );
}

// ===== Pane 3 メイン =====

export function ProjectDashboardPane({
  project,
  categoryName,
  members,
  selectedDetail,
  onOpenDetail,
  onUpdateDeadline,
  onToggleTaskDone,
  onAddTask,
  overviewOpen,
  onOverviewOpenChange,
}: {
  project: Project;
  categoryName: string;
  members: Member[];
  selectedDetail: SelectedDetail;
  onOpenDetail: (next: SelectedDetail, scrollAnchor?: string) => void;
  onUpdateDeadline: (deadline: string) => void;
  onToggleTaskDone: (taskId: string) => void;
  onAddTask: (title: string) => void;
  overviewOpen: boolean;
  onOverviewOpenChange: (open: boolean) => void;
}) {
  return (
    <section className="min-w-0 flex-1 bg-canvas">
      <ScrollArea className="h-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-8 py-8">
          <OverviewCard
            project={project}
            categoryName={categoryName}
            open={overviewOpen}
            onOpenChange={onOverviewOpenChange}
            onUpdateDeadline={onUpdateDeadline}
          />

          <AiSummaryCard key={project.id} project={project} />

          <TaskListCard
            tasks={project.tasks}
            members={members}
            selectedDetail={selectedDetail}
            onOpenDetail={onOpenDetail}
            onToggleDone={onToggleTaskDone}
            onAddTask={onAddTask}
          />
        </div>
      </ScrollArea>
    </section>
  );
}

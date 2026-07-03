"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowUpRight, ChevronDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type Project,
  type Task,
  type Member,
  type SelectedDetail,
} from "@/lib/schema";
import {
  findTaskById,
  getSmallTasks,
  getTaskCompletionGroups,
  getTaskLineage,
  getTaskProgressSummaryForTask,
} from "@/lib/computed/projects";
import { PANE4_SECTION_IDS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { TaskProgressBar } from "@/components/workspace/TaskProgressBar";

function JumpIcon({ selected }: { selected: boolean }) {
  return (
    <ArrowUpRight
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0",
        selected ? "text-primary" : "text-muted-foreground",
      )}
    />
  );
}

export function ProjectDashboardPane({
  project,
  activeTaskId,
  members,
  selectedDetail,
  onOpenDetail,
  onToggleTaskDone,
  onAddTask,
}: {
  project: Project;
  activeTaskId: string | null;
  members: Member[];
  selectedDetail: SelectedDetail;
  onOpenDetail: (next: SelectedDetail, scrollAnchor?: string) => void;
  onToggleTaskDone: (taskId: string) => void;
  onAddTask: (
    title: string,
    options: { parentTaskId: string | null; level: Task["level"] },
  ) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const activeTask = findTaskById(project.tasks, activeTaskId);
  const smallTasks = activeTask ? getSmallTasks(project.tasks, activeTask.id) : [];
  const smallTaskGroups = getTaskCompletionGroups(project.tasks, smallTasks);
  const selectedSmallTask =
    selectedDetail?.type === "task"
      ? findTaskById(project.tasks, selectedDetail.taskId)
      : null;
  const lineage = getTaskLineage(project.tasks, activeTask);

  return (
    <section className="min-w-0 flex-1 bg-canvas">
      <ScrollArea className="h-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>{activeTask?.title ?? project.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {lineage.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {lineage.map((task) => (
                      <Badge key={task.id} variant="outline" size="xs">
                        {task.title}
                      </Badge>
                    ))}
                  </div>
                )}
                <TaskMeta task={activeTask} members={members} />
                {activeTask && (
                  <TaskProgressBar
                    title={activeTask.title}
                    summary={getTaskProgressSummaryForTask(
                      project.tasks,
                      activeTask,
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>小項目タスク</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setAddOpen(true)}
                disabled={!activeTask}
                aria-label="小項目タスクを追加"
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <Plus />
              </Button>
            </CardHeader>
            <CardContent>
              {smallTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  小項目タスクがありません
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  <SmallTaskList
                    tasks={smallTaskGroups.openTasks}
                    projectTasks={project.tasks}
                    members={members}
                    selectedDetail={selectedDetail}
                    onToggleTaskDone={onToggleTaskDone}
                    onOpenDetail={onOpenDetail}
                  />

                  <CompletedTaskSection
                    count={smallTaskGroups.completedTasks.length}
                  >
                    <SmallTaskList
                      tasks={smallTaskGroups.completedTasks}
                      projectTasks={project.tasks}
                      members={members}
                      selectedDetail={selectedDetail}
                      onToggleTaskDone={onToggleTaskDone}
                      onOpenDetail={onOpenDetail}
                    />
                  </CompletedTaskSection>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedSmallTask && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedSmallTask.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <TaskMeta task={selectedSmallTask} members={members} />
                  <TaskProgressBar
                    title={selectedSmallTask.title}
                    summary={getTaskProgressSummaryForTask(
                      project.tasks,
                      selectedSmallTask,
                    )}
                  />
                  {selectedSmallTask.memo && (
                    <>
                      <Separator />
                      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                        {selectedSmallTask.memo}
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="小項目タスクを追加"
        description="選択中の大項目または中項目に小項目タスクを追加します"
        fieldLabel="タスク名"
        fieldId="small-task-title"
        placeholder="例: 原稿ライティング"
        onAdd={(title) =>
          onAddTask(title, {
            parentTaskId: activeTask?.id ?? null,
            level: activeTask ? "small" : "large",
          })
        }
      />
    </section>
  );
}

function SmallTaskList({
  tasks,
  projectTasks,
  members,
  selectedDetail,
  onToggleTaskDone,
  onOpenDetail,
}: {
  tasks: Task[];
  projectTasks: Task[];
  members: Member[];
  selectedDetail: SelectedDetail;
  onToggleTaskDone: (taskId: string) => void;
  onOpenDetail: (next: SelectedDetail, scrollAnchor?: string) => void;
}) {
  return (
    <>
      {tasks.map((task, index) => {
        const selected =
          selectedDetail?.type === "task" && selectedDetail.taskId === task.id;
        return (
          <div key={task.id}>
            {index > 0 && <Separator className="my-1" />}
            <SmallTaskRow
              task={task}
              projectTasks={projectTasks}
              members={members}
              selected={selected}
              onToggleDone={() => onToggleTaskDone(task.id)}
              onOpen={() =>
                onOpenDetail(
                  { type: "task", taskId: task.id },
                  PANE4_SECTION_IDS.detail.info,
                )
              }
            />
          </div>
        );
      })}
    </>
  );
}

function SmallTaskRow({
  task,
  projectTasks,
  members,
  selected,
  onToggleDone,
  onOpen,
}: {
  task: Task;
  projectTasks: Task[];
  members: Member[];
  selected: boolean;
  onToggleDone: () => void;
  onOpen: () => void;
}) {
  const progress = getTaskProgressSummaryForTask(projectTasks, task);
  const assigneeName =
    members.find((member) => member.id === task.assigneeId)?.name ??
    "未アサイン";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md px-2 py-2 transition-colors",
        selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/40",
      )}
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={onToggleDone}
        aria-label={`${task.title} を完了にする`}
        className="mt-0.5"
      />
      <button
        type="button"
        onClick={onOpen}
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
        <span className="text-xs text-muted-foreground">
          {assigneeName}
          {task.dueDate && ` / ${task.dueDate}`}
        </span>
        <TaskProgressBar title={task.title} summary={progress} />
      </button>
      <JumpIcon selected={selected} />
    </div>
  );
}

function CompletedTaskSection({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <Collapsible defaultOpen={false}>
      <div className="flex flex-col gap-1">
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-between"
            >
              <span>完了済み {count}</span>
              <ChevronDown className="transition-transform in-data-[panel-open]:rotate-180" />
            </Button>
          }
        />
        <CollapsibleContent>
          <div className="flex flex-col gap-1">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function TaskMeta({
  task,
  members,
}: {
  task: Task | null;
  members: Member[];
}) {
  if (!task) {
    return (
      <p className="text-sm text-muted-foreground">
        大項目タスクを選択してください
      </p>
    );
  }

  const assigneeName =
    members.find((member) => member.id === task.assigneeId)?.name ??
    "未アサイン";

  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">状態</dt>
        <dd>{task.done ? "完了" : "未完了"}</dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">担当者</dt>
        <dd>{assigneeName}</dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">期限</dt>
        <dd>{task.dueDate || "未設定"}</dd>
      </div>
    </dl>
  );
}

"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { type Member, type Project, type Task } from "@/lib/schema";
import {
  getLargeTasks,
  getMediumTasks,
  getSmallTaskCounts,
} from "@/lib/computed/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";

type ProjectListPaneProps = {
  project: Project | null;
  members: Member[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onAddTask: (
    title: string,
    options: { parentTaskId: string | null; level: Task["level"] },
  ) => void;
};

export function ProjectListPane({
  project,
  members,
  selectedTaskId,
  onSelectTask,
  onAddTask,
}: ProjectListPaneProps) {
  const [addLargeOpen, setAddLargeOpen] = useState(false);
  const [addMediumParentId, setAddMediumParentId] = useState<string | null>(
    null,
  );

  const largeTasks = project ? getLargeTasks(project.tasks) : [];
  const addMediumParent =
    project?.tasks.find((task) => task.id === addMediumParentId) ?? null;

  return (
    <section className="flex w-[320px] shrink-0 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          大項目タスク
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setAddLargeOpen(true)}
          disabled={!project}
          aria-label="大項目タスクを追加"
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <Plus />
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 px-3 py-4">
          {largeTasks.map((task) => {
            const mediumTasks = getMediumTasks(project?.tasks ?? [], task.id);
            const open =
              selectedTaskId === task.id ||
              mediumTasks.some((mediumTask) => mediumTask.id === selectedTaskId);

            return (
              <Collapsible key={task.id} defaultOpen={open}>
                <div className="flex flex-col gap-1">
                  <TaskRow
                    task={task}
                    project={project}
                    members={members}
                    selected={selectedTaskId === task.id}
                    onSelect={() => onSelectTask(task.id)}
                    action={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAddMediumParentId(task.id);
                        }}
                        aria-label={`${task.title} に中項目タスクを追加`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Plus />
                      </Button>
                    }
                    trigger={
                      mediumTasks.length > 0 ? (
                        <CollapsibleTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`${task.title} の中項目を開閉`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ChevronDown className="transition-transform in-data-[panel-open]:rotate-180" />
                            </Button>
                          }
                        />
                      ) : null
                    }
                  />

                  {mediumTasks.length > 0 && (
                    <CollapsibleContent>
                      <div className="flex flex-col gap-1 pl-5">
                        {mediumTasks.map((mediumTask) => (
                          <TaskRow
                            key={mediumTask.id}
                            task={mediumTask}
                            project={project}
                            members={members}
                            selected={selectedTaskId === mediumTask.id}
                            onSelect={() => onSelectTask(mediumTask.id)}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  )}
                </div>
              </Collapsible>
            );
          })}

          {project && largeTasks.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              大項目タスクがありません
            </p>
          )}

          {!project && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              プロジェクトがありません
            </p>
          )}
        </div>
      </ScrollArea>

      <AddItemDialog
        open={addLargeOpen}
        onOpenChange={setAddLargeOpen}
        title="大項目タスクを追加"
        description="選択中のプロジェクトに大項目タスクを追加します"
        fieldLabel="タスク名"
        fieldId="large-task-title"
        placeholder="例: 要件定義"
        onAdd={(title) => onAddTask(title, { parentTaskId: null, level: "large" })}
      />

      {addMediumParent && (
        <AddItemDialog
          open={addMediumParentId !== null}
          onOpenChange={(open) => {
            if (!open) setAddMediumParentId(null);
          }}
          title="中項目タスクを追加"
          description={`「${addMediumParent.title}」に中項目タスクを追加します`}
          fieldLabel="タスク名"
          fieldId="medium-task-title"
          placeholder="例: 画面設計"
          onAdd={(title) =>
            onAddTask(title, {
              parentTaskId: addMediumParent.id,
              level: "medium",
            })
          }
        />
      )}
    </section>
  );
}

function TaskRow({
  task,
  project,
  members,
  selected,
  onSelect,
  action,
  trigger,
}: {
  task: Task;
  project: Project | null;
  members: Member[];
  selected: boolean;
  onSelect: () => void;
  action?: ReactNode;
  trigger?: ReactNode;
}) {
  const counts = project
    ? getSmallTaskCounts(project.tasks, task.id)
    : { done: 0, total: 0 };
  const assigneeName =
    members.find((member) => member.id === task.assigneeId)?.name ??
    "未アサイン";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex w-full flex-col gap-2 rounded-md px-2.5 py-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected ? "bg-accent text-accent-foreground" : "hover:bg-muted",
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {trigger}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
            task.done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
        {action}
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <Badge variant="secondary" size="xs">
          {counts.done}/{counts.total}
        </Badge>
        {task.dueDate && (
          <Badge variant="outline" size="xs">
            {task.dueDate}
          </Badge>
        )}
        <span className="truncate text-xs text-muted-foreground">
          {assigneeName}
        </span>
      </span>
    </div>
  );
}

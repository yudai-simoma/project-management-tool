"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import type { DayButtonProps } from "react-day-picker";

import { cn, formatISODate, parseISODate } from "@/lib/utils";
import { type Member, type Project, type Task } from "@/lib/schema";
import {
  getTaskCompletionGroups,
  getLargeTasks,
  getMediumTasks,
  getTaskCalendarDays,
  getTaskProgressSummaryForTask,
  type TaskCalendarDay,
} from "@/lib/computed/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { TaskProgressBar } from "@/components/workspace/TaskProgressBar";

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
  const largeTaskGroups = project
    ? getTaskCompletionGroups(project.tasks, largeTasks)
    : { openTasks: [], completedTasks: [] };
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

      <TaskCalendarView project={project} />

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 px-3 py-4">
          {largeTaskGroups.openTasks.map((task) => (
            <LargeTaskItem
              key={task.id}
              task={task}
              project={project}
              members={members}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
              onAddMediumTask={setAddMediumParentId}
            />
          ))}

          <CompletedTaskSection count={largeTaskGroups.completedTasks.length}>
            {largeTaskGroups.completedTasks.map((task) => (
              <LargeTaskItem
                key={task.id}
                task={task}
                project={project}
                members={members}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                onAddMediumTask={setAddMediumParentId}
              />
            ))}
          </CompletedTaskSection>

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

const TASK_LEVEL_LABEL: Record<Task["level"], string> = {
  large: "大項目",
  medium: "中項目",
  small: "小項目",
};

function LargeTaskItem({
  task,
  project,
  members,
  selectedTaskId,
  onSelectTask,
  onAddMediumTask,
}: {
  task: Task;
  project: Project | null;
  members: Member[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onAddMediumTask: (taskId: string) => void;
}) {
  const mediumTasks = getMediumTasks(project?.tasks ?? [], task.id);
  const mediumTaskGroups = project
    ? getTaskCompletionGroups(project.tasks, mediumTasks)
    : { openTasks: [], completedTasks: [] };
  const open =
    selectedTaskId === task.id ||
    mediumTasks.some((mediumTask) => mediumTask.id === selectedTaskId);

  return (
    <Collapsible defaultOpen={open}>
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
                onAddMediumTask(task.id);
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
              {mediumTaskGroups.openTasks.map((mediumTask) => (
                <TaskRow
                  key={mediumTask.id}
                  task={mediumTask}
                  project={project}
                  members={members}
                  selected={selectedTaskId === mediumTask.id}
                  onSelect={() => onSelectTask(mediumTask.id)}
                />
              ))}

              <CompletedTaskSection
                count={mediumTaskGroups.completedTasks.length}
              >
                {mediumTaskGroups.completedTasks.map((mediumTask) => (
                  <TaskRow
                    key={mediumTask.id}
                    task={mediumTask}
                    project={project}
                    members={members}
                    selected={selectedTaskId === mediumTask.id}
                    onSelect={() => onSelectTask(mediumTask.id)}
                  />
                ))}
              </CompletedTaskSection>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

function TaskCalendarView({ project }: { project: Project | null }) {
  const [selectedDates, setSelectedDates] = useState<Record<string, string>>({});
  const [visibleMonths, setVisibleMonths] = useState<Record<string, string>>({});

  const calendarDays = useMemo(
    () => getTaskCalendarDays(project?.tasks ?? []),
    [project?.tasks],
  );
  const calendarDayMap = useMemo(
    () => new Map(calendarDays.map((day) => [day.date, day])),
    [calendarDays],
  );
  const projectId = project?.id ?? "";
  const selectedDateKey =
    projectId && selectedDates[projectId]
      ? selectedDates[projectId]
      : (calendarDays[0]?.date ?? "");
  const selectedDate = parseISODate(selectedDateKey);
  const monthKey =
    projectId && visibleMonths[projectId]
      ? visibleMonths[projectId]
      : (selectedDateKey || formatISODate(new Date()));
  const visibleMonth = parseISODate(monthKey) ?? new Date();
  const taskCount = calendarDays.reduce((sum, day) => sum + day.tasks.length, 0);
  const doneTaskCount = calendarDays.reduce(
    (sum, day) => sum + day.doneTasks.length,
    0,
  );
  const selectedCalendarDay = selectedDateKey
    ? calendarDayMap.get(selectedDateKey)
    : undefined;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border px-3 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="truncate text-xs font-semibold text-muted-foreground">
          カレンダー
        </h3>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <Badge variant="outline" size="xs">
            期日 {taskCount}
          </Badge>
          <Badge variant="secondary" size="xs">
            完了 {doneTaskCount}
          </Badge>
        </span>
      </div>

      <Calendar
        mode="single"
        selected={selectedDate}
        month={visibleMonth}
        onMonthChange={(month) => {
          if (!projectId) return;
          const nextMonth = formatISODate(startOfMonth(month));
          setVisibleMonths((current) => ({
            ...current,
            [projectId]: nextMonth,
          }));
        }}
        onSelect={(date) => {
          if (!projectId || !date) return;
          const nextDate = formatISODate(date);
          setSelectedDates((current) => ({
            ...current,
            [projectId]: nextDate,
          }));
          setVisibleMonths((current) => ({
            ...current,
            [projectId]: formatISODate(startOfMonth(date)),
          }));
        }}
        locale={ja}
        disabled={!project}
        className="mx-auto bg-transparent p-0 [--cell-size:--spacing(8)]"
        components={{
          DayButton: (props) => {
            const date = formatISODate(props.day.date);
            return (
              <TaskCalendarDayButton
                {...props}
                calendarDay={calendarDayMap.get(date)}
              />
            );
          },
        }}
      />

      <CalendarDayDetails day={selectedCalendarDay} hasTasks={taskCount > 0} />
    </div>
  );
}

function TaskCalendarDayButton({
  calendarDay,
  children,
  className,
  ...props
}: DayButtonProps & { calendarDay?: TaskCalendarDay }) {
  return (
    <CalendarDayButton className={cn(className)} {...props}>
      <span>{children}</span>
      {calendarDay && (
        <span
          className="flex items-center gap-0.5 !opacity-100"
          aria-hidden="true"
        >
          {calendarDay.openTasks.length > 0 && (
            <span className="size-1 rounded-full bg-primary" />
          )}
          {calendarDay.doneTasks.length > 0 && (
            <span className="size-1 rounded-full bg-muted-foreground" />
          )}
        </span>
      )}
    </CalendarDayButton>
  );
}

function CalendarDayDetails({
  day,
  hasTasks,
}: {
  day?: TaskCalendarDay;
  hasTasks: boolean;
}) {
  if (!hasTasks) {
    return (
      <p className="rounded-md bg-card px-2 py-2 text-xs text-muted-foreground">
        期日のあるタスクはありません
      </p>
    );
  }

  if (!day) {
    return (
      <p className="rounded-md bg-card px-2 py-2 text-xs text-muted-foreground">
        この日のタスクはありません
      </p>
    );
  }

  const visibleTasks = day.tasks.slice(0, 3);

  return (
    <div className="flex flex-col gap-2 rounded-md bg-card px-2 py-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
          {format(day.dateValue, "M月d日(E)", { locale: ja })}
        </span>
        <Badge variant="outline" size="xs">
          未完了 {day.openTasks.length}
        </Badge>
        <Badge variant="secondary" size="xs">
          完了 {day.doneTasks.length}
        </Badge>
      </div>

      <div className="flex flex-col gap-1">
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            className="flex min-w-0 items-center gap-1.5 rounded-md bg-background px-2 py-1.5"
          >
            <Badge variant={task.done ? "secondary" : "outline"} size="xs">
              {task.done ? "完了" : "未完了"}
            </Badge>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs text-foreground",
                task.done && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </span>
            <Badge variant="outline" size="xs">
              {TASK_LEVEL_LABEL[task.level]}
            </Badge>
          </div>
        ))}
      </div>

      {day.tasks.length > visibleTasks.length && (
        <p className="text-xs text-muted-foreground">
          他 {day.tasks.length - visibleTasks.length} 件
        </p>
      )}
    </div>
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
  const progress = project
    ? getTaskProgressSummaryForTask(project.tasks, task)
    : { done: 0, total: 0, percent: 0 };
  const completed = progress.total > 0 && progress.done === progress.total;
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
            completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
        {action}
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <Badge variant="secondary" size="xs">
          {progress.done}/{progress.total}
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
      <TaskProgressBar title={task.title} summary={progress} />
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

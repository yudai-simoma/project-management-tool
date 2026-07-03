"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { type ProjectRow, type ProjectStatusKey } from "@/lib/schema";
import { DEADLINE_RISK_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Pane 2 のステータス列用、ドラッグ可能なプロジェクト行。
 *
 * 採用管理サンプルの `SortableCandidateRow` と同じ dnd-kit 構成
 * （行全体クリック = 選択、左端のグリップのみ drag listener）を踏襲する。
 * 表示内容は「プロジェクト名 + 期限バッジ」の 1 行目、「進捗率バー + 数値」の 2 行目。
 */
export function SortableProjectRow({
  project,
  status,
  selected,
  onSelect,
  actions,
}: {
  project: ProjectRow;
  status: ProjectStatusKey;
  selected: boolean;
  onSelect: (id: string) => void;
  actions: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    data: { containerId: status, name: project.name },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/project relative",
        isDragging && "pointer-events-none opacity-50",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(project.id)}
        className={cn(
          "flex w-full flex-col gap-2 rounded-md px-2.5 py-2.5 text-left transition-colors",
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          selected
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            {...attributes}
            {...listeners}
            aria-label={`${project.name} の並び替え`}
            className={cn(
              "flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground",
              "opacity-0 transition-opacity group-focus-within/project:opacity-100 group-hover/project:opacity-100",
              "hover:text-foreground active:cursor-grabbing",
              "outline-none focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
            // ドラッグハンドルだけのクリックで選択動作が走らないようにする
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">
            {project.name}
          </span>
          <DeadlineBadge
            deadline={project.deadline}
            risk={project.deadlineRisk}
          />
        </div>
        <div className="flex items-center gap-2 pl-7">
          <Progress value={project.progress} className="h-1.5 flex-1" />
          <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {project.progress}%
          </span>
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "absolute top-2.5 right-1",
                "opacity-0 group-focus-within/project:opacity-100 group-hover/project:opacity-100",
                "transition-opacity",
                "text-muted-foreground hover:text-foreground",
              )}
              aria-label={`${project.name} の操作`}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuGroup>{actions}</DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function DeadlineBadge({
  deadline,
  risk,
}: {
  deadline: string;
  risk: ProjectRow["deadlineRisk"];
}) {
  if (risk === "none") {
    return (
      <Badge variant="outline" size="xs" className="shrink-0">
        期限未設定
      </Badge>
    );
  }
  return (
    <Badge
      variant={risk === "overdue" ? "destructive" : "outline"}
      size="xs"
      className="shrink-0"
      aria-label={DEADLINE_RISK_LABEL[risk]}
    >
      {deadline}
    </Badge>
  );
}

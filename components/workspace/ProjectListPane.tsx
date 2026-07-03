"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { cn } from "@/lib/utils";
import {
  type ProjectRow,
  type Group,
  type ProjectStatusKey,
} from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { SortableProjectRow } from "@/components/workspace/SortableProjectRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { STATUS_LABELS } from "@/lib/labels";

// dnd-kit のスクリーンリーダー向け日本語化。
const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "Space または Enter でプロジェクトを持ち上げ、矢印キーで移動、Space で確定、Esc でキャンセルします。",
};

const FALLBACK_PROJECT_NAME = "プロジェクト";

type ProjectListPaneProps = {
  groups: Group[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (status: ProjectStatusKey, name: string) => void;
  onDeleteProject: (id: string, name: string) => void;
  onMoveProject: (
    id: string,
    toStatus: ProjectStatusKey,
    toIndex: number,
  ) => void;
  canAddProject: boolean;
};

export function ProjectListPane({
  groups,
  selectedProjectId,
  onSelectProject,
  onAddProject,
  onDeleteProject,
  onMoveProject,
  canAddProject,
}: ProjectListPaneProps) {
  const [addDialogStatus, setAddDialogStatus] = useState<{
    status: ProjectStatusKey;
    label: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // PointerSensor の distance 制約で「クリック」と「ドラッグ」を区別する
  // （6px 以上動かさないとドラッグ起動しない → 行クリック / メニュー操作と衝突しない）。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ドラッグ中の浮遊行表示用に元データを引く
  const activeDragRow: { row: ProjectRow; status: ProjectStatusKey } | null =
    (() => {
      if (!activeDragId) return null;
      for (const g of groups) {
        const row = g.items.find((r) => r.id === activeDragId);
        if (row) return { row, status: g.status };
      }
      return null;
    })();

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const name =
        (active.data.current?.name as string | undefined) ??
        FALLBACK_PROJECT_NAME;
      return `${name}を持ち上げました。`;
    },
    onDragOver: ({ active, over }) => {
      const name =
        (active.data.current?.name as string | undefined) ??
        FALLBACK_PROJECT_NAME;
      if (!over) return `${name}を移動中です。`;
      const overContainer = over.data.current?.containerId as
        ProjectStatusKey | undefined;
      if (overContainer)
        return `${name}を「${STATUS_LABELS[overContainer]}」の上に移動しました。`;
      return `${name}を移動中です。`;
    },
    onDragEnd: ({ active, over }) => {
      const name =
        (active.data.current?.name as string | undefined) ??
        FALLBACK_PROJECT_NAME;
      if (!over) return `${name}の移動をキャンセルしました。`;
      const overContainer =
        (over.data.current?.containerId as ProjectStatusKey | undefined) ??
        (typeof over.id === "string" && groups.some((g) => g.status === over.id)
          ? (over.id as ProjectStatusKey)
          : undefined);
      if (!overContainer) return `${name}を確定しました。`;
      return `${name}を「${STATUS_LABELS[overContainer]}」に移動しました。`;
    },
    onDragCancel: ({ active }) => {
      const name =
        (active.data.current?.name as string | undefined) ??
        FALLBACK_PROJECT_NAME;
      return `${name}の移動をキャンセルしました。`;
    },
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeContainer = active.data.current?.containerId as
      ProjectStatusKey | undefined;
    const overContainer =
      (over.data.current?.containerId as ProjectStatusKey | undefined) ??
      (typeof over.id === "string" && groups.some((g) => g.status === over.id)
        ? (over.id as ProjectStatusKey)
        : undefined);

    if (!activeContainer || !overContainer) return;

    const targetGroup = groups.find((g) => g.status === overContainer);
    if (!targetGroup) return;

    if (active.id === over.id) return;

    const overIndexInTarget = targetGroup.items.findIndex(
      (r) => r.id === over.id,
    );
    const toIndex =
      overIndexInTarget >= 0 ? overIndexInTarget : targetGroup.items.length;

    onMoveProject(String(active.id), overContainer, toIndex);
  };

  return (
    <section className="flex w-[300px] shrink-0 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          プロジェクト一覧
        </h2>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <DndContext
          // 固定 id を渡して SSR/CSR 間の `aria-describedby` 採番ズレ
          // （DndDescribedBy-N の連番）による hydration mismatch を回避する
          id="pane2-project-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          accessibility={{ announcements, screenReaderInstructions }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          <div className="flex flex-col gap-5 px-3 py-4">
            {groups.map((group) => (
              <StatusGroup
                key={`status:${group.status}`}
                status={group.status}
                label={group.label}
                items={group.items}
                selectedProjectId={selectedProjectId}
                onSelectProject={onSelectProject}
                canAddProject={canAddProject}
                onAddRequest={() =>
                  setAddDialogStatus({
                    status: group.status,
                    label: group.label,
                  })
                }
                onDeleteRequest={(id, name) => setDeleteTarget({ id, name })}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDragRow && (
              <div className="flex flex-col gap-2 rounded-md bg-accent px-2.5 py-2.5 text-accent-foreground shadow-lg">
                <p className="truncate text-sm">{activeDragRow.row.name}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </ScrollArea>

      {addDialogStatus && (
        <AddItemDialog
          open={addDialogStatus !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialogStatus(null);
          }}
          title="プロジェクトを追加"
          description={`「${addDialogStatus.label}」に新しいプロジェクトを追加します`}
          fieldLabel="プロジェクト名"
          fieldId="project-name-pane2"
          placeholder="例: コーポレートサイトリニューアル"
          onAdd={(name) => onAddProject(addDialogStatus.status, name)}
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="プロジェクトを削除しますか？"
        itemName={deleteTarget?.name ?? ""}
        description={`「${deleteTarget?.name ?? ""}」を削除します。配下のタスクも含めて完全に削除され、元に戻せません。`}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteProject(deleteTarget.id, deleteTarget.name);
            setDeleteTarget(null);
          }
        }}
      />
    </section>
  );
}

function StatusGroup({
  status,
  label,
  items,
  selectedProjectId,
  onSelectProject,
  canAddProject,
  onAddRequest,
  onDeleteRequest,
}: {
  status: ProjectStatusKey;
  label: string;
  items: ProjectRow[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  canAddProject: boolean;
  onAddRequest: () => void;
  onDeleteRequest: (id: string, name: string) => void;
}) {
  // 空ステータスでもドロップを受け取れるようにする（常時 4 列表示するため）。
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone:${status}`,
    data: { containerId: status },
  });

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between gap-2 bg-background px-5 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </h3>
          <Badge variant="secondary" size="xs">
            {items.length}
          </Badge>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onAddRequest}
                disabled={!canAddProject}
                aria-label={`${label} にプロジェクトを追加`}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus aria-hidden="true" />
              </Button>
            }
          />
          <TooltipContent side="top">
            {canAddProject
              ? `${label} にプロジェクトを追加`
              : "先に Pane 1 でカテゴリを選択してください"}
          </TooltipContent>
        </Tooltip>
      </div>
      <SortableContext
        id={status}
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          data-status={status}
          className={cn(
            "flex flex-col gap-1",
            items.length === 0 &&
              "min-h-12 rounded-md border border-dashed border-border/70 p-2",
            items.length === 0 && isOver && "border-primary/60 bg-primary/5",
          )}
        >
          {items.length === 0 ? (
            <li
              className={cn(
                "pointer-events-none flex h-8 items-center justify-center text-xs",
                isOver ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              ここへドラッグ
            </li>
          ) : (
            items.map((project) => (
              <SortableProjectRow
                key={project.id}
                project={project}
                status={status}
                selected={project.id === selectedProjectId}
                onSelect={onSelectProject}
                actions={
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDeleteRequest(project.id, project.name)}
                  >
                    <Trash2 />
                    削除
                  </DropdownMenuItem>
                }
              />
            ))
          )}
        </ul>
      </SortableContext>
    </div>
  );
}

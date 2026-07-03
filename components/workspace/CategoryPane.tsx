"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";

import { type Project } from "@/lib/schema";
import {
  deriveDeadlineRisk,
  getSmallTaskCounts,
} from "@/lib/computed/projects";
import { DEADLINE_RISK_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InlineTextField } from "@/components/primitives";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { MANAGE_ROLE_TOOLTIP } from "@/lib/labels";

type CategoryPaneProps = {
  workspaceName: string;
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onAddProject: (name: string) => void;
  onUpdateProjectName: (projectId: string, name: string) => void;
  onDeleteProject: (projectId: string) => void;
  canDeleteProject: boolean;
};

export function CategoryPane({
  workspaceName,
  projects,
  selectedProjectId,
  onSelectProject,
  onAddProject,
  onUpdateProjectName,
  onDeleteProject,
  canDeleteProject,
}: CategoryPaneProps) {
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");
    const filtered = normalizedQuery
      ? projects.filter((project) =>
          project.name.toLocaleLowerCase("ja-JP").includes(normalizedQuery),
        )
      : projects;

    return [...filtered].sort((a, b) => {
      const aCounts = getSmallTaskCounts(a.tasks, null);
      const bCounts = getSmallTaskCounts(b.tasks, null);
      const aDone = aCounts.total > 0 && aCounts.done === aCounts.total;
      const bDone = bCounts.total > 0 && bCounts.done === bCounts.total;
      if (aDone !== bDone) return aDone ? 1 : -1;
      const aDeadline = a.deadline || "9999-12-31";
      const bDeadline = b.deadline || "9999-12-31";
      return aDeadline.localeCompare(bDeadline);
    });
  }, [projects, query]);

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border [&_[data-slot=sidebar-container]]:bg-sidebar"
      >
        <SidebarHeader className="border-b border-sidebar-border p-0">
          <div className="flex h-12 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[state=expanded]:px-5">
            <h2 className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {workspaceName}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setAddOpen(true)}
                aria-label="プロジェクトを追加"
                className="group-data-[collapsible=icon]:hidden"
              >
                <Plus />
              </Button>
              <Pane1Toggle />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3 group-data-[collapsible=icon]:hidden">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="プロジェクトを検索"
                placeholder="プロジェクトを検索"
                className="pl-8"
              />
            </div>

            <SidebarMenu>
              {visibleProjects.map((project) => {
                const active = project.id === selectedProjectId;
                const counts = getSmallTaskCounts(project.tasks, null);
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      render={<div />}
                      tooltip={project.name}
                      isActive={active}
                      aria-current={active ? "page" : undefined}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectProject(project.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectProject(project.id);
                        }
                      }}
                      className="h-auto items-start py-2"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <InlineTextField
                          key={`${project.id}:${project.name}`}
                          value={project.name}
                          onSave={(name) =>
                            onUpdateProjectName(project.id, name)
                          }
                          ariaLabel={`${project.name} のプロジェクト名`}
                          className="h-7"
                          onFocus={() => onSelectProject(project.id)}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <div className="flex min-w-0 items-center gap-1.5">
                          <DeadlineBadge deadline={project.deadline} />
                          <Badge variant="secondary" size="xs">
                            {counts.done}/{counts.total}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`${project.name} の操作`}
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal />
                            </Button>
                          }
                        />
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuGroup>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <DropdownMenuItem
                                    variant="destructive"
                                    disabled={!canDeleteProject}
                                    onClick={() => setDeleteTarget(project)}
                                  >
                                    <Trash2 />
                                    削除
                                  </DropdownMenuItem>
                                }
                              />
                              {!canDeleteProject && (
                                <TooltipContent side="right">
                                  {MANAGE_ROLE_TOOLTIP}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {visibleProjects.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                プロジェクトがありません
              </p>
            )}
          </div>
        </SidebarContent>
      </Sidebar>

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="プロジェクトを追加"
        description="新しいプロジェクトを追加します"
        fieldLabel="プロジェクト名"
        fieldId="project-name"
        placeholder="例: 基幹システムリプレイス"
        onAdd={onAddProject}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="プロジェクトを削除しますか？"
        itemName={deleteTarget?.name ?? ""}
        description={`「${deleteTarget?.name ?? ""}」を削除します。配下のタスクも含めて完全に削除され、元に戻せません。`}
        onConfirm={() => {
          if (!deleteTarget) return;
          onDeleteProject(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const risk = deriveDeadlineRisk(deadline);
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

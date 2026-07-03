"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { type Category, type Project } from "@/lib/schema";
import { STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { InlineTextField } from "@/components/primitives";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";

type CategoryPaneProps = {
  workspaceName: string;
  categories: Category[];
  projects: Project[];
  selectedCategoryId: string | null;
  selectedProjectId: string;
  onSelectCategory: (categoryId: string | null) => void;
  onSelectProject: (projectId: string) => void;
  onAddProject: (categoryId: string, name: string) => void;
  onUpdateCategoryName: (categoryId: string, name: string) => void;
};

/**
 * Pane 1: プロジェクトカテゴリ → プロジェクトの階層 Sidebar。
 *
 * 社内のプロジェクト管理ツールでは外部クライアントではなく、社内の分類軸
 * （カテゴリ）でプロジェクトをグルーピングする。カテゴリの選択が実際に
 * Pane 2（プロジェクト一覧）を絞り込む。
 *
 * - カテゴリ名クリック: そのカテゴリで Pane 2 を絞り込む（再クリックで解除）
 * - 「すべてのカテゴリ」: 絞り込み解除
 * - プロジェクト（leaf）クリック: そのプロジェクトを選択し、Pane 3 を開く
 *   （所属カテゴリでの絞り込みも同時に有効になる）
 */
export function CategoryPane({
  workspaceName,
  categories,
  projects,
  selectedCategoryId,
  selectedProjectId,
  onSelectCategory,
  onSelectProject,
  onAddProject,
  onUpdateCategoryName,
}: CategoryPaneProps) {
  const [addDialogCategoryId, setAddDialogCategoryId] = useState<string | null>(
    null,
  );

  const addDialogCategory = categories.find(
    (c) => c.id === addDialogCategoryId,
  );

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
            <Pane1Toggle />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-1 py-3 group-data-[collapsible=icon]:hidden">
          <SidebarMenu className="mb-2 px-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={selectedCategoryId === null}
                onClick={() => onSelectCategory(null)}
              >
                <span className="truncate">すべてのカテゴリ</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {categories.map((category) => {
            const categoryProjects = projects.filter(
              (p) => p.categoryId === category.id,
            );
            const isCategoryActive = selectedCategoryId === category.id;

            return (
              <SidebarGroup key={category.id} className="px-1">
                <div
                  className={cn(
                    "flex h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-xs font-semibold tracking-wide uppercase transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    isCategoryActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <InlineTextField
                    key={`${category.id}:${category.name}`}
                    value={category.name}
                    onSave={(name) => onUpdateCategoryName(category.id, name)}
                    ariaLabel={`${category.name} のカテゴリ名`}
                    className="h-7 flex-1"
                    onFocus={() => {
                      if (!isCategoryActive) onSelectCategory(category.id);
                    }}
                  />
                  <Badge variant="secondary" size="xs">
                    {categoryProjects.length}
                  </Badge>
                </div>
                <SidebarGroupAction
                  title={`${category.name} にプロジェクトを追加`}
                  onClick={() => setAddDialogCategoryId(category.id)}
                  className="w-6 rounded-[min(var(--radius-md),10px)] text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:size-3"
                >
                  <Plus />
                  <span className="sr-only">
                    {category.name} にプロジェクトを追加
                  </span>
                </SidebarGroupAction>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {categoryProjects.map((project) => {
                      const active = project.id === selectedProjectId;
                      return (
                        <SidebarMenuItem key={project.id}>
                          <SidebarMenuButton
                            tooltip={project.name}
                            isActive={active}
                            aria-current={active ? "page" : undefined}
                            onClick={() => onSelectProject(project.id)}
                          >
                            <span className="truncate">{project.name}</span>
                            <Badge
                              variant="outline"
                              size="xs"
                              className="ml-auto shrink-0"
                            >
                              {STATUS_LABELS[project.status]}
                            </Badge>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
      </Sidebar>

      {addDialogCategory && (
        <AddItemDialog
          open={addDialogCategoryId !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialogCategoryId(null);
          }}
          title="プロジェクトを追加"
          description={`${addDialogCategory.name} に新しいプロジェクトを追加します`}
          fieldLabel="プロジェクト名"
          fieldId="project-name"
          placeholder="例: 基幹システムリプレイス"
          onAdd={(name) => onAddProject(addDialogCategory.id, name)}
        />
      )}
    </>
  );
}

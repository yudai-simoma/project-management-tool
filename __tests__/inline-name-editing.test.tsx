import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";

import { SidebarProvider } from "@/components/ui/sidebar";
import { CategoryPane } from "@/components/workspace/CategoryPane";
import { SortableProjectRow } from "@/components/workspace/SortableProjectRow";
import type { Category, Project, ProjectRow } from "@/lib/schema";

const categories: Category[] = [{ id: "cat-1", name: "プロダクト開発" }];
const projects: Project[] = [
  {
    id: "p-1",
    name: "基幹システム刷新",
    categoryId: "cat-1",
    status: "planning",
    deadline: "",
    tasks: [],
  },
];

describe("カテゴリ名・プロジェクト名のインライン編集", () => {
  it("Pane1のカテゴリ名はInlineTextFieldで保存でき、focus時にカテゴリを選択する", () => {
    const onSelectCategory = vi.fn();
    const onUpdateCategoryName = vi.fn();

    render(
      <SidebarProvider>
        <CategoryPane
          workspaceName="プロジェクト管理"
          categories={categories}
          projects={projects}
          selectedCategoryId={null}
          selectedProjectId="p-1"
          onSelectCategory={onSelectCategory}
          onSelectProject={vi.fn()}
          onAddProject={vi.fn()}
          onUpdateCategoryName={onUpdateCategoryName}
        />
      </SidebarProvider>,
    );

    const input = screen.getByLabelText("プロダクト開発 のカテゴリ名");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "新カテゴリ" } });
    fireEvent.blur(input);

    expect(onSelectCategory).toHaveBeenCalledWith("cat-1");
    expect(onUpdateCategoryName).toHaveBeenCalledWith("cat-1", "新カテゴリ");
  });

  it("Pane2のプロジェクト名はInlineTextFieldで保存でき、focus時にプロジェクトを選択する", () => {
    const project: ProjectRow = {
      id: "p-1",
      name: "基幹システム刷新",
      progress: 25,
      deadline: "",
      deadlineRisk: "none",
    };
    const onSelect = vi.fn();
    const onRename = vi.fn();

    render(
      <DndContext>
        <SortableContext items={[project.id]}>
          <SortableProjectRow
            project={project}
            status="planning"
            selected={false}
            onSelect={onSelect}
            onRename={onRename}
            actions={<button type="button">削除</button>}
          />
        </SortableContext>
      </DndContext>,
    );

    const input = screen.getByLabelText("基幹システム刷新 のプロジェクト名");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "新プロジェクト" } });
    fireEvent.blur(input);

    expect(onSelect).toHaveBeenCalledWith("p-1");
    expect(onRename).toHaveBeenCalledWith("p-1", "新プロジェクト");
  });
});

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";

import { SidebarProvider } from "@/components/ui/sidebar";
import { CategoryPane } from "@/components/workspace/CategoryPane";
import { SortableProjectRow } from "@/components/workspace/SortableProjectRow";
import type { Project, ProjectRow } from "@/lib/schema";

const projects: Project[] = [
  {
    id: "p-1",
    name: "基幹システム刷新",
    status: "planning",
    deadline: "",
    tasks: [],
  },
];

describe("プロジェクト名のインライン編集", () => {
  it("Pane1のプロジェクト名はInlineTextFieldで保存でき、focus時にプロジェクトを選択する", () => {
    const onSelectProject = vi.fn();
    const onUpdateProjectName = vi.fn();

    render(
      <SidebarProvider>
        <CategoryPane
          workspaceName="プロジェクト管理"
          projects={projects}
          selectedProjectId="p-1"
          onSelectProject={onSelectProject}
          onAddProject={vi.fn()}
          onUpdateProjectName={onUpdateProjectName}
          onDeleteProject={vi.fn()}
          canDeleteProject
        />
      </SidebarProvider>,
    );

    const input = screen.getByLabelText("基幹システム刷新 のプロジェクト名");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "新プロジェクト" } });
    fireEvent.blur(input);

    expect(onSelectProject).toHaveBeenCalledWith("p-1");
    expect(onUpdateProjectName).toHaveBeenCalledWith("p-1", "新プロジェクト");
  });

  it("Pane2のプロジェクト名はInlineTextFieldで保存でき、focus時にプロジェクトを選択する", () => {
    const project: ProjectRow = {
      id: "p-1",
      name: "基幹システム刷新",
      deadline: "",
      deadlineRisk: "none",
      doneCount: 1,
      totalCount: 4,
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

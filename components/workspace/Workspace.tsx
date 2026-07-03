"use client";

/**
 * Workspace: 4 ペインの親コンポーネント（社内プロジェクト管理ドメイン）。
 *
 * - Pane 1〜4 の state（categories / members / projects / selectedProjectId /
 *   selectedCategoryId / selectedDetail / pane4Tab）を保持し、各ペインに props として渡す。
 * - Pane 1 = プロジェクトカテゴリ → プロジェクトの階層（`CategoryPane`）。カテゴリ選択は
 *   実際に Pane 2 を絞り込む
 * - Pane 2 = プロジェクト一覧、ステータス別カンバン（`ProjectListPane`）
 * - Pane 3 = 選択プロジェクトのダッシュボード（`ProjectDashboardPane`、読む場所）
 * - Pane 4 = タブ切替式の詳細編集（`ProjectDetailPane`、詳細タブ / AIアシスタントタブ）
 *
 * レイアウト構造（shadcn/ui Sidebar を採用、採用管理サンプルの構造を踏襲）:
 *
 * ```
 * <SidebarProvider> (h-screen, defaultOpen, Cmd+B でトグル)
 * ┌─ Sidebar (Pane 1) ─┬─ SidebarInset ─────────────────────┐
 * │ (画面最上端          │ ┌─ GlobalHeader (h-12) ─────────┐ │
 * │  〜最下端)           │ └─────────────────────────────────┘ │
 * │ collapsible="icon"  │ ┌─ Pane 2 ─┬─ Pane 3 ─┬─ Pane 4 ─┐ │
 * │ 240px ↔ 48px        │ │          │          │          │ │
 * └────────────────────┴─┴──────────┴──────────┴──────────┘
 * ```
 *
 * 仕様の出典: `docs/mock-implementation-plan.md` §2.2（4ペイン構成）・§6.5（本ファイルの
 * state/handler 対応表）。
 */

import { useState, useCallback, useMemo } from "react";

import {
  type Category,
  type Member,
  type Project,
  type ProjectStatusKey,
  type SelectedDetail,
  type Pane4Tab,
  type MainView,
  type Group,
  STATUS_ORDER,
} from "@/lib/schema";
import { createEmptyProject, createMinimalTask } from "@/lib/data/factories";
import {
  getProjectProgress,
  deriveDeadlineRisk,
} from "@/lib/computed/projects";
import { STATUS_LABELS } from "@/lib/labels";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { CategoryPane } from "@/components/workspace/CategoryPane";
import { ProjectListPane } from "@/components/workspace/ProjectListPane";
import { ProjectDashboardPane } from "@/components/workspace/ProjectDashboardPane";
import { ProjectDetailPane } from "@/components/workspace/ProjectDetailPane";
import { PortfolioDashboardPane } from "@/components/workspace/PortfolioDashboardPane";

// `onUpdateTaskField` の field 引数で使う key の union 型。
// ProjectDetailPane.tsx 内部の同形の型と同期させる規律（export はしない）。
type EditableTaskKey = "title" | "dueDate" | "assigneeId" | "memo";

type WorkspaceProps = {
  initialCategories: Category[];
  initialMembers: Member[];
  initialProjects: Project[];
  workspace: { name: string; icon: string };
};

export function Workspace({
  initialCategories,
  initialMembers,
  initialProjects,
  workspace,
}: WorkspaceProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [members] = useState<Member[]>(initialMembers);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjects[0]?.id ?? "",
  );
  // Pane 1 ↔ Pane 2 の実フィルタ。null = 「すべてのカテゴリ」。
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail>(null);
  const [pane4Tab, setPane4Tab] = useState<Pane4Tab>("detail");
  const [scrollAnchor, setScrollAnchor] = useState<string | null>(null);
  // Pane 4 の開閉状態。タスク選択だけでなく、プロジェクト選択時にも
  // AI アシスタントタブへすぐ到達できるよう、selectedDetail から独立させている。
  const [pane4Open, setPane4Open] = useState(false);
  // Pane 3 概要ヘッダー帯（Collapsible）の開閉。プロジェクト切替時は開き直す。
  const [overviewOpen, setOverviewOpen] = useState(true);
  // GlobalHeader のビュー切替（通常のワークスペース／全体ダッシュボード）。
  const [mainView, setMainView] = useState<MainView>("workspace");

  // アクティブプロジェクト。プロジェクトが 1 件も無い場合は null（削除で全件無くなった場合の
  // 保険）。Pane 3 / Pane 4 は null のとき空状態を表示する。
  const activeProject: Project | null =
    projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null;

  const activeProjectCategoryName = activeProject
    ? (categories.find((c) => c.id === activeProject.categoryId)?.name ?? "")
    : "";

  // ===== Pane 1: カテゴリ選択（実フィルタ） =====

  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    // ダッシュボード表示中に Pane 1 を操作したら、迷わず作業に戻れるようワークスペース表示へ。
    setMainView("workspace");
  }, []);

  // ===== プロジェクト選択（共通ロジック） =====

  const selectProject = useCallback((id: string) => {
    setSelectedProjectId(id);
    setSelectedDetail(null);
    // タスク未選択の状態で開くため、まず取りかかりやすい AI アシスタントタブを開く。
    setPane4Tab("ai");
    setPane4Open(true);
    setOverviewOpen(true);
    setMainView("workspace");
  }, []);

  // Pane 1 でプロジェクト（leaf）をクリックしたときのみ、所属カテゴリでの
  // 絞り込みも同時に有効にする（§2.2 決定）。Pane 2 からの選択はフィルタに触らない。
  const selectProjectFromPane1 = useCallback(
    (id: string) => {
      const project = projects.find((p) => p.id === id);
      if (project) setSelectedCategoryId(project.categoryId);
      selectProject(id);
    },
    [projects, selectProject],
  );

  // ===== プロジェクトの追加・削除・移動 =====

  const addProject = useCallback(
    (
      categoryId: string,
      name: string,
      status: ProjectStatusKey = "planning",
    ) => {
      const newProject = createEmptyProject(categoryId, name, status);
      setProjects((prev) => [...prev, newProject]);
      setSelectedCategoryId(categoryId);
      selectProject(newProject.id);
    },
    [selectProject],
  );

  // Pane 1 の各カテゴリグループの「+」から呼ばれる。常時有効、status は "planning" 固定。
  const addProjectForCategory = useCallback(
    (categoryId: string, name: string) =>
      addProject(categoryId, name, "planning"),
    [addProject],
  );

  // Pane 2 のステータス列の「+」から呼ばれる。`canAddProject`（selectedCategoryId !== null）
  // で事前にガードされているが、防御的に selectedCategoryId の有無を再確認する。
  const addProjectForStatus = useCallback(
    (status: ProjectStatusKey, name: string) => {
      if (!selectedCategoryId) return;
      addProject(selectedCategoryId, name, status);
    },
    [addProject, selectedCategoryId],
  );

  // プロジェクトの削除は Pane 2 のみ（§2.2 決定、Pane 1 に削除導線は置かない）。
  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (id === selectedProjectId) {
          setSelectedProjectId(next[0]?.id ?? "");
          setSelectedDetail(null);
        }
        return next;
      });
    },
    [selectedProjectId],
  );

  // プロジェクトを別ステータスへ移動 / 同ステータス内で並び替え。
  //
  // `toIndex` は ProjectListPane 側で計算された、**現在のカテゴリフィルタ後**の
  // 表示上のインデックスなので、projects 配列上の絶対インデックスに変換する際にも
  // 同じフィルタ条件（selectedCategoryId）を適用してカウントする必要がある。
  const moveProject = useCallback(
    (id: string, toStatus: ProjectStatusKey, toIndex: number) => {
      setProjects((prev) => {
        const subjectIndex = prev.findIndex((p) => p.id === id);
        if (subjectIndex < 0) return prev;
        const subject = prev[subjectIndex];

        const without = prev.filter((_, i) => i !== subjectIndex);
        const updated: Project = { ...subject, status: toStatus };

        let count = 0;
        let absInsertAt = without.length;
        for (let i = 0; i < without.length; i++) {
          const p = without[i];
          const visible =
            selectedCategoryId === null || p.categoryId === selectedCategoryId;
          if (visible && p.status === toStatus) {
            if (count === toIndex) {
              absInsertAt = i;
              break;
            }
            count++;
          }
        }
        return [
          ...without.slice(0, absInsertAt),
          updated,
          ...without.slice(absInsertAt),
        ];
      });
    },
    [selectedCategoryId],
  );

  // ===== カテゴリの追加・削除（SettingsDialog 用） =====

  const addCategory = useCallback((name: string) => {
    setCategories((prev) => [...prev, { id: `cat-${Date.now()}`, name }]);
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setSelectedCategoryId((prev) => (prev === categoryId ? null : prev));
  }, []);

  // ===== タスクの編集（アクティブプロジェクトのタスクを操作） =====

  const updateTaskField = useCallback(
    (taskId: string, field: EditableTaskKey, value: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== selectedProjectId
            ? p
            : {
                ...p,
                tasks: p.tasks.map((t) =>
                  t.id === taskId ? { ...t, [field]: value } : t,
                ),
              },
        ),
      );
    },
    [selectedProjectId],
  );

  // Pane 3 のチェックボックス、および Pane 4「詳細」タブの完了トグルの両方から呼ばれる。
  const toggleTaskDone = useCallback(
    (taskId: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== selectedProjectId
            ? p
            : {
                ...p,
                tasks: p.tasks.map((t) =>
                  t.id === taskId ? { ...t, done: !t.done } : t,
                ),
              },
        ),
      );
    },
    [selectedProjectId],
  );

  // Pane 3「+ タスク追加」、および Pane 4 AIアシスタントタブの両方から呼ばれる。
  const addTask = useCallback(
    (title: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== selectedProjectId
            ? p
            : { ...p, tasks: [...p.tasks, createMinimalTask(title)] },
        ),
      );
    },
    [selectedProjectId],
  );

  // タスクの削除は Pane 4「詳細」タブの手動削除のみ（AI アシスタントからは実行不可、§2.5 決定）。
  const deleteTask = useCallback(
    (taskId: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== selectedProjectId
            ? p
            : { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) },
        ),
      );
      setSelectedDetail((prev) =>
        prev?.type === "task" && prev.taskId === taskId ? null : prev,
      );
    },
    [selectedProjectId],
  );

  // Pane 3 概要ヘッダー帯の期限編集（`InlineDateField`）から呼ばれる。
  const updateDeadline = useCallback(
    (deadline: string) => {
      setProjects((prev) =>
        prev.map((p) => (p.id !== selectedProjectId ? p : { ...p, deadline })),
      );
    },
    [selectedProjectId],
  );

  // Pane 3 のタスク行クリックで Pane 4「詳細」タブを開く。
  const openDetail = useCallback((next: SelectedDetail, anchor?: string) => {
    setSelectedDetail(next);
    setScrollAnchor(anchor ?? null);
    setPane4Tab("detail");
    setPane4Open(true);
  }, []);

  const pane4TabChange = useCallback((tab: Pane4Tab) => setPane4Tab(tab), []);
  const consumeScrollAnchor = useCallback(() => setScrollAnchor(null), []);
  const togglePane4 = useCallback(() => setPane4Open((v) => !v), []);

  // Pane 2 のステータス別グルーピング。selectedCategoryId によるフィルタ後に集計する。
  // 4 ステータス列は常に表示する（空列でも D&D の戻し先として残す）。
  const projectGroups: Group[] = useMemo(() => {
    const filtered =
      selectedCategoryId === null
        ? projects
        : projects.filter((p) => p.categoryId === selectedCategoryId);

    return STATUS_ORDER.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      items: filtered
        .filter((p) => p.status === status)
        .map((p) => ({
          id: p.id,
          name: p.name,
          progress: getProjectProgress(p),
          deadline: p.deadline,
          deadlineRisk: deriveDeadlineRisk(p.deadline),
        })),
    }));
  }, [projects, selectedCategoryId]);

  return (
    // shadcn/ui の SidebarProvider が外側を取り、Pane 1 (`<Sidebar>`) を全高で固定
    // 表示する。SidebarInset が右側ブロック（GlobalHeader + Pane 2/3/4）を担う。
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-background text-foreground"
    >
      <CategoryPane
        workspaceName={workspace.name}
        categories={categories}
        projects={projects}
        selectedCategoryId={selectedCategoryId}
        selectedProjectId={selectedProjectId}
        onSelectCategory={selectCategory}
        onSelectProject={selectProjectFromPane1}
        onAddProject={addProjectForCategory}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          categoryName={activeProjectCategoryName}
          projectName={activeProject?.name ?? ""}
          categories={categories}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          mainView={mainView}
          onMainViewChange={setMainView}
        />
        {/* SidebarInset 自体が <main> を出すので、内側は <div> で組み、
            Pane 2 / Pane 3 / Pane 4（もしくは全体ダッシュボード）を横並びにする。 */}
        <div className="flex min-h-0 flex-1">
          {mainView === "dashboard" ? (
            <PortfolioDashboardPane projects={projects} />
          ) : (
            <>
              <ProjectListPane
                groups={projectGroups}
                selectedProjectId={selectedProjectId}
                onSelectProject={selectProject}
                onAddProject={addProjectForStatus}
                onDeleteProject={deleteProject}
                onMoveProject={moveProject}
                canAddProject={selectedCategoryId !== null}
              />
              {activeProject ? (
                <>
                  <ProjectDashboardPane
                    project={activeProject}
                    categoryName={activeProjectCategoryName}
                    members={members}
                    selectedDetail={selectedDetail}
                    onOpenDetail={openDetail}
                    onUpdateDeadline={updateDeadline}
                    onToggleTaskDone={toggleTaskDone}
                    onAddTask={addTask}
                    overviewOpen={overviewOpen}
                    onOverviewOpenChange={setOverviewOpen}
                  />
                  <ProjectDetailPane
                    selectedProjectId={selectedProjectId}
                    project={activeProject}
                    members={members}
                    selectedDetail={selectedDetail}
                    scrollAnchor={scrollAnchor}
                    onScrollAnchorConsumed={consumeScrollAnchor}
                    onUpdateTaskField={updateTaskField}
                    onToggleTaskDone={toggleTaskDone}
                    onDeleteTask={deleteTask}
                    onAddTask={addTask}
                    pane4Open={pane4Open}
                    onTogglePane4={togglePane4}
                    pane4Tab={pane4Tab}
                    onPane4TabChange={pane4TabChange}
                  />
                </>
              ) : (
                <section className="flex min-w-0 flex-1 items-center justify-center bg-canvas">
                  <p className="text-sm text-muted-foreground">
                    プロジェクトがありません。Pane 1 または Pane 2
                    から追加してください。
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

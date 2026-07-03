"use client";

/**
 * Workspace: 4 ペインの親コンポーネント（社内プロジェクト管理ドメイン）。
 *
 * - Pane 1〜4 の state（members / projects / selectedProjectId /
 *   selectedHierarchyTaskId / selectedDetail / pane4Tab）を保持し、各ペインに props として渡す。
 * - Pane 1 = プロジェクト名だけのフラットな一覧（`CategoryPane`）
 * - Pane 2 = 選択プロジェクトの大項目/中項目タスク（`ProjectListPane`）
 * - Pane 3 = 小項目タスク一覧と読み取り詳細（`ProjectDashboardPane`、読む場所）
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

import {
  useState,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useOrganization, useUser } from "@clerk/nextjs";

import { toRole } from "@/lib/auth/roles";
import { canManageOrg } from "@/lib/auth/permissions";
import {
  type Member,
  type Project,
  type SelectedDetail,
  type Pane4Tab,
  type MainView,
  type Task,
} from "@/lib/schema";
import { createEmptyProject, createMinimalTask } from "@/lib/data/factories";
import {
  findTaskById,
  getLargeTasks,
} from "@/lib/computed/projects";
import { AI_CHAT_GREETING } from "@/lib/labels";
import {
  GEMINI_FLASH_LATEST_CONTEXT_TOKENS,
  GEMINI_FLASH_LATEST_MODEL_ID,
} from "@/lib/ai/model-config";
import type { AiChatUsage } from "@/lib/api/ai-client";
import { runOptimistic, insertAt } from "@/lib/optimistic";
import {
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
} from "@/lib/api/workspace-client";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { CategoryPane } from "@/components/workspace/CategoryPane";
import { ProjectListPane } from "@/components/workspace/ProjectListPane";
import { ProjectDashboardPane } from "@/components/workspace/ProjectDashboardPane";
import {
  ProjectDetailPane,
  type ProjectAiChatMessage,
  type ProjectAiChatModel,
} from "@/components/workspace/ProjectDetailPane";
import { PortfolioDashboardPane } from "@/components/workspace/PortfolioDashboardPane";

// `onUpdateTaskField` の field 引数で使う key の union 型。
// ProjectDetailPane.tsx 内部の同形の型と同期させる規律（export はしない）。
type EditableTaskKey = "title" | "dueDate" | "assigneeId" | "memo";

type ProjectAiChatState = {
  messages: ProjectAiChatMessage[];
  tokenUsageTotal: number;
  model: ProjectAiChatModel;
};

type WorkspaceProps = {
  initialMembers: Member[];
  initialProjects: Project[];
  workspace: { name: string; icon: string };
};

function createInitialAiChatState(): ProjectAiChatState {
  return {
    messages: [
      {
        id: "greeting",
        role: "assistant",
        kind: "text",
        content: AI_CHAT_GREETING,
      },
    ],
    tokenUsageTotal: 0,
    model: {
      id: GEMINI_FLASH_LATEST_MODEL_ID,
      maxContextTokens: GEMINI_FLASH_LATEST_CONTEXT_TOKENS,
    },
  };
}

function getUsageTotalTokens(usage: AiChatUsage | null): number {
  if (!usage) return 0;
  if (typeof usage.totalTokens === "number") return usage.totalTokens;
  return (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
}

export function Workspace({
  initialMembers,
  initialProjects,
  workspace,
}: WorkspaceProps) {
  const [members] = useState<Member[]>(initialMembers);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjects[0]?.id ?? "",
  );
  const [selectedHierarchyTaskId, setSelectedHierarchyTaskId] = useState<
    string | null
  >(
    () =>
      getLargeTasks(initialProjects[0]?.tasks ?? [])[0]?.id ??
      initialProjects[0]?.tasks[0]?.id ??
      null,
  );
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail>(null);
  const [pane4Tab, setPane4Tab] = useState<Pane4Tab>("detail");
  const [scrollAnchor, setScrollAnchor] = useState<string | null>(null);
  // Pane 4 の開閉状態。タスク選択だけでなく、プロジェクト選択時にも
  // AI アシスタントタブへすぐ到達できるよう、selectedDetail から独立させている。
  const [pane4Open, setPane4Open] = useState(false);
  // GlobalHeader のビュー切替（通常のワークスペース／全体ダッシュボード）。
  const [mainView, setMainView] = useState<MainView>("workspace");
  // Pane 4 AIチャット履歴はプロジェクト単位で保持する。MVPではブラウザセッション内の
  // React state に留め、リロードをまたぐ永続化は別ステップに切り出す。
  const [projectAiChats, setProjectAiChats] = useState<
    Record<string, ProjectAiChatState>
  >({});

  // ロールに基づく操作制限（§6決定）。プロジェクト削除・カテゴリ削除は Owner/Admin のみ、
  // タスク削除は担当者本人 または Owner/Admin に許可する（`lib/auth/permissions.ts` 参照）。
  const { membership } = useOrganization();
  const { user } = useUser();
  const currentUserId = user?.id ?? "";
  const canManage = canManageOrg(toRole(membership?.role));

  // アクティブプロジェクト。プロジェクトが 1 件も無い場合は null（削除で全件無くなった場合の
  // 保険）。Pane 3 / Pane 4 は null のとき空状態を表示する。
  const activeProject: Project | null =
    projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null;

  const activeHierarchyTask =
    activeProject && findTaskById(activeProject.tasks, selectedHierarchyTaskId)
      ? findTaskById(activeProject.tasks, selectedHierarchyTaskId)
      : (getLargeTasks(activeProject?.tasks ?? [])[0] ?? null);
  const activeHierarchyTaskId = activeHierarchyTask?.id ?? null;

  const activeProjectAiChat = useMemo(
    () => projectAiChats[selectedProjectId] ?? createInitialAiChatState(),
    [projectAiChats, selectedProjectId],
  );

  const updateActiveProjectAiChat = useCallback(
    (updater: (current: ProjectAiChatState) => ProjectAiChatState) => {
      setProjectAiChats((prev) => {
        const current = prev[selectedProjectId] ?? createInitialAiChatState();
        return { ...prev, [selectedProjectId]: updater(current) };
      });
    },
    [selectedProjectId],
  );

  const updateActiveProjectAiMessages: Dispatch<
    SetStateAction<ProjectAiChatMessage[]>
  > = useCallback(
    (updater) => {
      updateActiveProjectAiChat((current) => ({
        ...current,
        messages:
          typeof updater === "function" ? updater(current.messages) : updater,
      }));
    },
    [updateActiveProjectAiChat],
  );

  const registerAiUsage = useCallback(
    (usage: AiChatUsage | null, model: ProjectAiChatModel) => {
      const totalTokens = getUsageTotalTokens(usage);
      updateActiveProjectAiChat((current) => ({
        ...current,
        tokenUsageTotal: current.tokenUsageTotal + totalTokens,
        model,
      }));
    },
    [updateActiveProjectAiChat],
  );

  const clearActiveProjectAiChat = useCallback(() => {
    updateActiveProjectAiChat((current) => ({
      ...current,
      messages: [],
      tokenUsageTotal: 0,
    }));
  }, [updateActiveProjectAiChat]);

  // ===== プロジェクト選択（共通ロジック） =====

  const selectProject = useCallback(
    (id: string) => {
      const project = projects.find((p) => p.id === id);
      setSelectedProjectId(id);
      setSelectedHierarchyTaskId(
        getLargeTasks(project?.tasks ?? [])[0]?.id ?? project?.tasks[0]?.id ?? null,
      );
      setSelectedDetail(null);
      setPane4Tab("ai");
      setPane4Open(true);
      setMainView("workspace");
    },
    [projects],
  );

  const selectHierarchyTask = useCallback((taskId: string) => {
    setSelectedHierarchyTaskId(taskId);
    setSelectedDetail(null);
    setMainView("workspace");
  }, []);

  // ===== プロジェクトの追加・削除 =====

  // 楽観的更新方針（§2 で確認済み）: ローカル state は即座に更新し、API呼び出しは
  // 裏で行う。失敗時はローカル state を黙って元に戻す（console.error に記録するのみ、
  // 見た目・UI部品は追加しない）。`activeProject` は `projects` 配列から都度導出される
  // ため、追加系のロールバックで対象を配列から取り除けば、選択状態は自動的に
  // 他のプロジェクトへフォールバックする（追加直後の細かい選択状態までは巻き戻さない）。
  const addProject = useCallback(
    (name: string) => {
      const newProject = createEmptyProject(name);
      setProjects((prev) => [...prev, newProject]);
      selectProject(newProject.id);

      runOptimistic(
        () =>
          createProjectApi({
            id: newProject.id,
            name: newProject.name,
            status: newProject.status,
            deadline: newProject.deadline,
          }),
        () => setProjects((prev) => prev.filter((p) => p.id !== newProject.id)),
      );
    },
    [selectProject],
  );

  const deleteProject = useCallback(
    (id: string) => {
      let removed: { item: Project; index: number } | null = null;
      let selectionChanged = false;
      setProjects((prev) => {
        const index = prev.findIndex((p) => p.id === id);
        if (index === -1) return prev;
        removed = { item: prev[index], index };
        const next = [...prev.slice(0, index), ...prev.slice(index + 1)];
        if (id === selectedProjectId) {
          selectionChanged = true;
          setSelectedProjectId(next[0]?.id ?? "");
          setSelectedHierarchyTaskId(
            getLargeTasks(next[0]?.tasks ?? [])[0]?.id ??
              next[0]?.tasks[0]?.id ??
              null,
          );
          setSelectedDetail(null);
        }
        return next;
      });

      runOptimistic(
        () => deleteProjectApi(id),
        () => {
          if (removed) insertAt(setProjects, removed.index, removed.item);
          if (selectionChanged) setSelectedProjectId(id);
        },
      );
    },
    [selectedProjectId],
  );

  // ===== タスクの編集（アクティブプロジェクトのタスクを操作） =====

  const updateTaskField = useCallback(
    (taskId: string, field: EditableTaskKey, value: string) => {
      const projectId = selectedProjectId;
      let previousValue: string | undefined;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map((t) => {
              if (t.id !== taskId) return t;
              previousValue = t[field];
              return { ...t, [field]: value };
            }),
          };
        }),
      );

      runOptimistic(
        () => updateTaskApi(taskId, { [field]: value }),
        () => {
          if (previousValue === undefined) return;
          setProjects((prev) =>
            prev.map((p) =>
              p.id !== projectId
                ? p
                : {
                    ...p,
                    tasks: p.tasks.map((t) =>
                      t.id === taskId ? { ...t, [field]: previousValue! } : t,
                    ),
                  },
            ),
          );
        },
      );
    },
    [selectedProjectId],
  );

  // Pane 3 のチェックボックス、および Pane 4「詳細」タブの完了トグルの両方から呼ばれる。
  const toggleTaskDone = useCallback(
    (taskId: string) => {
      const projectId = selectedProjectId;
      let nextDone: boolean | undefined;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map((t) => {
              if (t.id !== taskId) return t;
              nextDone = !t.done;
              return { ...t, done: nextDone };
            }),
          };
        }),
      );

      if (nextDone === undefined) return;
      const confirmedNextDone = nextDone;
      runOptimistic(
        () => updateTaskApi(taskId, { done: confirmedNextDone }),
        () =>
          setProjects((prev) =>
            prev.map((p) =>
              p.id !== projectId
                ? p
                : {
                    ...p,
                    tasks: p.tasks.map((t) =>
                      t.id === taskId ? { ...t, done: !confirmedNextDone } : t,
                    ),
                  },
            ),
          ),
      );
    },
    [selectedProjectId],
  );

  // Pane 3「+ タスク追加」、および Pane 4 AIアシスタントタブの提案確定から呼ばれる。
  // 単発追加（Pane3の「+」等）は従来通りタイトルのみで呼び出せる。
  const addTask = useCallback(
    (
      title: string,
      extra?: Partial<
        Pick<Task, "dueDate" | "assigneeId" | "memo" | "parentTaskId" | "level">
      >,
    ) => {
      const projectId = selectedProjectId;
      const fallbackParentId = activeHierarchyTaskId;
      const level = extra?.level ?? (fallbackParentId ? "small" : "large");
      const parentTaskId =
        extra?.parentTaskId !== undefined
          ? extra.parentTaskId
          : level === "large"
            ? null
            : fallbackParentId;
      const newTask: Task = {
        ...createMinimalTask(title),
        ...extra,
        level,
        parentTaskId,
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== projectId ? p : { ...p, tasks: [...p.tasks, newTask] },
        ),
      );
      if (newTask.level === "large" || newTask.level === "medium") {
        setSelectedHierarchyTaskId(newTask.id);
      }

      runOptimistic(
        () =>
          createTaskApi(projectId, {
            id: newTask.id,
            title: newTask.title,
            parentTaskId: newTask.parentTaskId,
            level: newTask.level,
            dueDate: newTask.dueDate,
            assigneeId: newTask.assigneeId,
            memo: newTask.memo,
          }),
        () =>
          setProjects((prev) =>
            prev.map((p) =>
              p.id !== projectId
                ? p
                : { ...p, tasks: p.tasks.filter((t) => t.id !== newTask.id) },
            ),
          ),
      );
    },
    [activeHierarchyTaskId, selectedProjectId],
  );

  // タスクの削除は Pane 4「詳細」タブの手動削除のみ（AI アシスタントからは実行不可、§2.5 決定）。
  const deleteTask = useCallback(
    (taskId: string) => {
      const projectId = selectedProjectId;
      let removed: { item: Task; index: number } | null = null;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const index = p.tasks.findIndex((t) => t.id === taskId);
          if (index === -1) return p;
          removed = { item: p.tasks[index], index };
          return {
            ...p,
            tasks: [...p.tasks.slice(0, index), ...p.tasks.slice(index + 1)],
          };
        }),
      );

      let detailCleared = false;
      setSelectedDetail((prev) => {
        if (prev?.type === "task" && prev.taskId === taskId) {
          detailCleared = true;
          return null;
        }
        return prev;
      });

      runOptimistic(
        () => deleteTaskApi(taskId),
        () => {
          if (removed) {
            const { item, index } = removed;
            setProjects((prev) =>
              prev.map((p) =>
                p.id !== projectId
                  ? p
                  : {
                      ...p,
                      tasks: [
                        ...p.tasks.slice(0, index),
                        item,
                        ...p.tasks.slice(index),
                      ],
                    },
              ),
            );
          }
          if (detailCleared) setSelectedDetail({ type: "task", taskId });
        },
      );
    },
    [selectedProjectId],
  );

  const updateProjectName = useCallback((projectId: string, name: string) => {
    let previousName: string | undefined;
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;
        previousName = project.name;
        return { ...project, name };
      }),
    );

    runOptimistic(
      () => updateProjectApi(projectId, { name }),
      () => {
        if (previousName === undefined) return;
        setProjects((prev) =>
          prev.map((project) =>
            project.id === projectId
              ? { ...project, name: previousName! }
              : project,
          ),
        );
      },
    );
  }, []);

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

  return (
    // shadcn/ui の SidebarProvider が外側を取り、Pane 1 (`<Sidebar>`) を全高で固定
    // 表示する。SidebarInset が右側ブロック（GlobalHeader + Pane 2/3/4）を担う。
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-background text-foreground"
    >
      <CategoryPane
        workspaceName={workspace.name}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={selectProject}
        onAddProject={addProject}
        onUpdateProjectName={updateProjectName}
        onDeleteProject={deleteProject}
        canDeleteProject={canManage}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          projectName={activeProject?.name ?? ""}
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
                project={activeProject}
                members={members}
                selectedTaskId={activeHierarchyTaskId}
                onSelectTask={selectHierarchyTask}
                onAddTask={addTask}
              />
              {activeProject ? (
                <>
                  <ProjectDashboardPane
                    project={activeProject}
                    activeTaskId={activeHierarchyTaskId}
                    members={members}
                    selectedDetail={selectedDetail}
                    onOpenDetail={openDetail}
                    onToggleTaskDone={toggleTaskDone}
                    onAddTask={addTask}
                  />
                  <ProjectDetailPane
                    selectedProjectId={selectedProjectId}
                    project={activeProject}
                    categoryName=""
                    members={members}
                    aiMessages={activeProjectAiChat.messages}
                    aiTokenUsageTotal={activeProjectAiChat.tokenUsageTotal}
                    aiModel={activeProjectAiChat.model}
                    selectedDetail={selectedDetail}
                    scrollAnchor={scrollAnchor}
                    onScrollAnchorConsumed={consumeScrollAnchor}
                    onAiMessagesChange={updateActiveProjectAiMessages}
                    onAiUsageReceived={registerAiUsage}
                    onClearAiChat={clearActiveProjectAiChat}
                    onUpdateTaskField={updateTaskField}
                    onToggleTaskDone={toggleTaskDone}
                    onDeleteTask={deleteTask}
                    onAddTask={addTask}
                    canManageOrg={canManage}
                    currentUserId={currentUserId}
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

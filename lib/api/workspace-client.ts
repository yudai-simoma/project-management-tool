/**
 * `Workspace.tsx`（クライアントコンポーネント）から `app/api/**` の Route Handler を
 * 呼び出すための薄い fetch ラッパー。
 *
 * 失敗時（レスポンスが non-OK）は Error を throw するのみで、リトライやロールバックは
 * 呼び出し側（`Workspace.tsx` の各ハンドラ、`lib/optimistic.ts` の `runOptimistic`）に委ねる。
 */

import type { Category, Project, ProjectStatusKey, Task } from "@/lib/schema";

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const message = await res
      .json()
      .then((body: unknown) =>
        typeof body === "object" && body !== null && "error" in body
          ? String((body as { error: unknown }).error)
          : null,
      )
      .catch(() => null);
    throw new Error(
      message ?? `APIリクエストに失敗しました (status: ${res.status})`,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ===== カテゴリ =====

export function createCategoryApi(input: {
  id: string;
  name: string;
}): Promise<Category> {
  return apiFetch<Category>("/api/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteCategoryApi(id: string): Promise<void> {
  return apiFetch<void>(`/api/categories/${id}`, { method: "DELETE" });
}

// ===== プロジェクト =====

export function createProjectApi(input: {
  id: string;
  name: string;
  categoryId: string;
  status: ProjectStatusKey;
  deadline: string;
}): Promise<Project> {
  return apiFetch<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProjectApi(
  id: string,
  patch: Partial<{
    name: string;
    categoryId: string;
    status: ProjectStatusKey;
    deadline: string;
  }>,
): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteProjectApi(id: string): Promise<void> {
  return apiFetch<void>(`/api/projects/${id}`, { method: "DELETE" });
}

/**
 * Pane 2 の D&D 並び替え確定時に、移動後の全プロジェクトの並び順をまとめて送る
 * （`docs/backend-implementation-plan.md` セクション2で確認した「全体を一括で再採番する」方針）。
 */
export function reorderProjectsApi(
  items: { id: string; status: ProjectStatusKey; sortOrder: number }[],
): Promise<void> {
  return apiFetch<void>("/api/projects/reorder", {
    method: "PATCH",
    body: JSON.stringify({ items }),
  });
}

// ===== タスク =====

export function createTaskApi(
  projectId: string,
  input: {
    id: string;
    title: string;
    done?: boolean;
    dueDate?: string;
    assigneeId?: string;
    memo?: string;
  },
): Promise<Task> {
  return apiFetch<Task>(`/api/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTaskApi(
  id: string,
  patch: Partial<{
    title: string;
    done: boolean;
    dueDate: string;
    assigneeId: string;
    memo: string;
  }>,
): Promise<Task> {
  return apiFetch<Task>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteTaskApi(id: string): Promise<void> {
  return apiFetch<void>(`/api/tasks/${id}`, { method: "DELETE" });
}

// メンバー管理UIは §4（Clerk Organizations）で実装するため、
// メンバー作成/更新/削除の fetch ラッパーは本セクションでは追加しない
// （読み取りは `app/page.tsx` が `db/repositories/members` を直接使う）。

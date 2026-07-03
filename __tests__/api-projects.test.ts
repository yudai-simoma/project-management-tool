import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/repositories/projects", () => ({
  listProjectsWithTasks: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  reorderProjects: vi.fn(),
}));
vi.mock("@/lib/api/auth", () => ({
  requireOrgId: vi.fn(async () => ({ ok: true, orgId: "org_test" })),
}));

import * as projectsRepo from "@/db/repositories/projects";
import { GET, POST } from "@/app/api/projects/route";
import { DELETE, PATCH } from "@/app/api/projects/[id]/route";
import { PATCH as REORDER } from "@/app/api/projects/reorder/route";

const sampleProject = {
  id: "p-1",
  name: "モバイルアプリ新機能開発",
  categoryId: "cat-1",
  status: "inProgress" as const,
  deadline: "",
  tasks: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/projects", () => {
  it("プロジェクト一覧（タスク込み）をそのまま返す", async () => {
    vi.mocked(projectsRepo.listProjectsWithTasks).mockResolvedValue([
      sampleProject,
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([sampleProject]);
  });
});

describe("POST /api/projects", () => {
  it("正常なボディでプロジェクトを作成し201を返す", async () => {
    vi.mocked(projectsRepo.createProject).mockResolvedValue(sampleProject);

    const res = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({
          id: "p-1",
          name: "モバイルアプリ新機能開発",
          categoryId: "cat-1",
        }),
      }),
    );

    expect(res.status).toBe(201);
    // status/deadline は zod の .default() により補完される
    expect(projectsRepo.createProject).toHaveBeenCalledWith("org_test", {
      id: "p-1",
      name: "モバイルアプリ新機能開発",
      categoryId: "cat-1",
      status: "planning",
      deadline: "",
    });
  });

  it("categoryId が無いと400を返す", async () => {
    const res = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ id: "p-1", name: "無効なプロジェクト" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(projectsRepo.createProject).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/projects/[id]", () => {
  it("status/deadline 等を部分更新できる", async () => {
    vi.mocked(projectsRepo.updateProject).mockResolvedValue({
      ...sampleProject,
      status: "done",
    });

    const res = await PATCH(
      new Request("http://localhost/api/projects/p-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      }),
      { params: Promise.resolve({ id: "p-1" }) },
    );

    expect(res.status).toBe(200);
    expect(projectsRepo.updateProject).toHaveBeenCalledWith("org_test", "p-1", {
      status: "done",
    });
  });

  it("存在しないプロジェクトは404を返す", async () => {
    vi.mocked(projectsRepo.updateProject).mockResolvedValue(null);

    const res = await PATCH(
      new Request("http://localhost/api/projects/none", {
        method: "PATCH",
        body: JSON.stringify({ deadline: "2026-08-01" }),
      }),
      { params: Promise.resolve({ id: "none" }) },
    );

    expect(res.status).toBe(404);
  });

  it("更新項目が空だと400を返す", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/projects/p-1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "p-1" }) },
    );

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/projects/[id]", () => {
  it("プロジェクトを削除し204を返す", async () => {
    vi.mocked(projectsRepo.deleteProject).mockResolvedValue(true);

    const res = await DELETE(
      new Request("http://localhost/api/projects/p-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "p-1" }) },
    );

    expect(res.status).toBe(204);
  });

  it("存在しないプロジェクトは404を返す", async () => {
    vi.mocked(projectsRepo.deleteProject).mockResolvedValue(false);

    const res = await DELETE(
      new Request("http://localhost/api/projects/none", { method: "DELETE" }),
      { params: Promise.resolve({ id: "none" }) },
    );

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/projects/reorder", () => {
  it("並び替え後の全件をまとめて再採番する", async () => {
    vi.mocked(projectsRepo.reorderProjects).mockResolvedValue(undefined);

    const items = [
      { id: "p-1", status: "inProgress" as const, sortOrder: 0 },
      { id: "p-2", status: "inProgress" as const, sortOrder: 1 },
    ];

    const res = await REORDER(
      new Request("http://localhost/api/projects/reorder", {
        method: "PATCH",
        body: JSON.stringify({ items }),
      }),
    );

    expect(res.status).toBe(204);
    expect(projectsRepo.reorderProjects).toHaveBeenCalledWith(
      "org_test",
      items,
    );
  });

  it("items が空配列だと400を返す", async () => {
    const res = await REORDER(
      new Request("http://localhost/api/projects/reorder", {
        method: "PATCH",
        body: JSON.stringify({ items: [] }),
      }),
    );

    expect(res.status).toBe(400);
    expect(projectsRepo.reorderProjects).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/repositories/tasks", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTaskById: vi.fn(),
}));
vi.mock("@/lib/api/auth", () => ({
  requireOrgId: vi.fn(async () => ({
    ok: true,
    orgId: "org_test",
    userId: "user_owner",
    role: "owner",
  })),
}));

import * as tasksRepo from "@/db/repositories/tasks";
import { requireOrgId } from "@/lib/api/auth";
import { POST } from "@/app/api/projects/[id]/tasks/route";
import { DELETE, PATCH } from "@/app/api/tasks/[id]/route";

const sampleTask = {
  id: "t-1",
  parentTaskId: null,
  level: "small" as const,
  title: "要件定義",
  done: false,
  dueDate: "",
  assigneeId: "",
  memo: "",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/projects/[id]/tasks", () => {
  it("プロジェクト配下にタスクを作成し201を返す", async () => {
    vi.mocked(tasksRepo.createTask).mockResolvedValue(sampleTask);

    const res = await POST(
      new Request("http://localhost/api/projects/p-1/tasks", {
        method: "POST",
        body: JSON.stringify({ id: "t-1", title: "要件定義" }),
      }),
      { params: Promise.resolve({ id: "p-1" }) },
    );

    expect(res.status).toBe(201);
    expect(tasksRepo.createTask).toHaveBeenCalledWith("org_test", "p-1", {
      id: "t-1",
      title: "要件定義",
      parentTaskId: null,
      level: "small",
      done: false,
      dueDate: "",
      assigneeId: "",
      memo: "",
    });
  });

  it("title が空だと400を返す", async () => {
    const res = await POST(
      new Request("http://localhost/api/projects/p-1/tasks", {
        method: "POST",
        body: JSON.stringify({ id: "t-1", title: "" }),
      }),
      { params: Promise.resolve({ id: "p-1" }) },
    );

    expect(res.status).toBe(400);
    expect(tasksRepo.createTask).not.toHaveBeenCalled();
  });

  it("存在しないプロジェクト・他組織のプロジェクトへの追加は404を返す", async () => {
    vi.mocked(tasksRepo.createTask).mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/projects/none/tasks", {
        method: "POST",
        body: JSON.stringify({ id: "t-1", title: "要件定義" }),
      }),
      { params: Promise.resolve({ id: "none" }) },
    );

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/tasks/[id]", () => {
  it("done を部分更新できる", async () => {
    vi.mocked(tasksRepo.updateTask).mockResolvedValue({
      ...sampleTask,
      done: true,
    });

    const res = await PATCH(
      new Request("http://localhost/api/tasks/t-1", {
        method: "PATCH",
        body: JSON.stringify({ done: true }),
      }),
      { params: Promise.resolve({ id: "t-1" }) },
    );

    expect(res.status).toBe(200);
    expect(tasksRepo.updateTask).toHaveBeenCalledWith("org_test", "t-1", {
      done: true,
    });
  });

  it("存在しないタスクは404を返す", async () => {
    vi.mocked(tasksRepo.updateTask).mockResolvedValue(null);

    const res = await PATCH(
      new Request("http://localhost/api/tasks/none", {
        method: "PATCH",
        body: JSON.stringify({ memo: "メモ" }),
      }),
      { params: Promise.resolve({ id: "none" }) },
    );

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/tasks/[id]", () => {
  it("Owner はどのタスクでも削除でき204を返す", async () => {
    vi.mocked(tasksRepo.getTaskById).mockResolvedValue(sampleTask);
    vi.mocked(tasksRepo.deleteTask).mockResolvedValue(true);

    const res = await DELETE(
      new Request("http://localhost/api/tasks/t-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "t-1" }) },
    );

    expect(res.status).toBe(204);
  });

  it("存在しないタスクは404を返す", async () => {
    vi.mocked(tasksRepo.getTaskById).mockResolvedValue(null);

    const res = await DELETE(
      new Request("http://localhost/api/tasks/none", { method: "DELETE" }),
      { params: Promise.resolve({ id: "none" }) },
    );

    expect(res.status).toBe(404);
    expect(tasksRepo.deleteTask).not.toHaveBeenCalled();
  });

  it("担当者本人（member）は自分のタスクを削除できる（§6決定）", async () => {
    vi.mocked(requireOrgId).mockResolvedValueOnce({
      ok: true,
      orgId: "org_test",
      userId: "user_member",
      role: "member",
    } as never);
    vi.mocked(tasksRepo.getTaskById).mockResolvedValue({
      ...sampleTask,
      assigneeId: "user_member",
    });
    vi.mocked(tasksRepo.deleteTask).mockResolvedValue(true);

    const res = await DELETE(
      new Request("http://localhost/api/tasks/t-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "t-1" }) },
    );

    expect(res.status).toBe(204);
  });

  it("member は他人が担当のタスクを削除できず403を返す（§6決定）", async () => {
    vi.mocked(requireOrgId).mockResolvedValueOnce({
      ok: true,
      orgId: "org_test",
      userId: "user_member",
      role: "member",
    } as never);
    vi.mocked(tasksRepo.getTaskById).mockResolvedValue({
      ...sampleTask,
      assigneeId: "user_other",
    });

    const res = await DELETE(
      new Request("http://localhost/api/tasks/t-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "t-1" }) },
    );

    expect(res.status).toBe(403);
    expect(tasksRepo.deleteTask).not.toHaveBeenCalled();
  });
});

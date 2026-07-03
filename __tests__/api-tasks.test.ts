import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/repositories/tasks", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

import * as tasksRepo from "@/db/repositories/tasks";
import { POST } from "@/app/api/projects/[id]/tasks/route";
import { DELETE, PATCH } from "@/app/api/tasks/[id]/route";

const sampleTask = {
  id: "t-1",
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
    expect(tasksRepo.createTask).toHaveBeenCalledWith("p-1", {
      id: "t-1",
      title: "要件定義",
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

  it("存在しないプロジェクトへの追加（外部キー制約違反）は404を返す", async () => {
    vi.mocked(tasksRepo.createTask).mockRejectedValue(
      new Error("foreign key violation"),
    );

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
    expect(tasksRepo.updateTask).toHaveBeenCalledWith("t-1", { done: true });
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
  it("タスクを削除し204を返す", async () => {
    vi.mocked(tasksRepo.deleteTask).mockResolvedValue(true);

    const res = await DELETE(
      new Request("http://localhost/api/tasks/t-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "t-1" }) },
    );

    expect(res.status).toBe(204);
  });

  it("存在しないタスクは404を返す", async () => {
    vi.mocked(tasksRepo.deleteTask).mockResolvedValue(false);

    const res = await DELETE(
      new Request("http://localhost/api/tasks/none", { method: "DELETE" }),
      { params: Promise.resolve({ id: "none" }) },
    );

    expect(res.status).toBe(404);
  });
});

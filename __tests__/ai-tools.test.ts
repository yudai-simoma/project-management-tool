import { describe, expect, it } from "vitest";

import { buildAiTools } from "@/lib/ai/tools";
import type { Member, Task } from "@/lib/schema";

/**
 * `lib/ai/tools.ts` の tool calling 定義のユニットテスト。
 *
 * ここの `execute` はDB/APIに触れない純粋関数（`docs/backend-implementation-plan.md`
 * セクション5の設計方針）のため、Gemini呼び出し自体をモックせずに直接検証できる。
 */

const members: Member[] = [
  { id: "m-1", name: "佐藤 健太", role: "owner" },
  { id: "m-2", name: "鈴木 花子", role: "member" },
];

const tasks: Task[] = [
  {
    id: "t-1",
    title: "既存タスク",
    done: false,
    dueDate: "2026-07-10",
    assigneeId: "m-1",
    memo: "",
  },
];

// `execute` は second 引数（ToolExecutionOptions）を必須とするが、本テストでは
// 参照しないため空オブジェクトのキャストで済ませる。
const executionOptions = {} as never;

describe("buildAiTools", () => {
  it("addTask: 担当者名で指定してもidに解決する", async () => {
    const tools = buildAiTools({ tasks, members });
    const output = await tools.addTask.execute(
      { title: "新規タスク", assigneeId: "鈴木 花子" },
      executionOptions,
    );
    expect(output).toEqual({
      type: "addTask",
      title: "新規タスク",
      dueDate: "",
      assigneeId: "m-2",
      memo: "",
    });
  });

  it("addTask: 未知の担当者指定は空文字（未アサイン）に解決する", async () => {
    const tools = buildAiTools({ tasks, members });
    const output = await tools.addTask.execute(
      { title: "新規タスク", assigneeId: "存在しない人" },
      executionOptions,
    );
    expect(output).toMatchObject({ assigneeId: "" });
  });

  it("updateTask: 指定フィールドのみpatchに含める", async () => {
    const tools = buildAiTools({ tasks, members });
    const output = await tools.updateTask.execute(
      { taskId: "t-1", memo: "更新メモ" },
      executionOptions,
    );
    expect(output).toEqual({
      type: "updateTask",
      taskId: "t-1",
      patch: { memo: "更新メモ" },
    });
  });

  it("updateTask: 存在しないタスクidはエラーを返す", async () => {
    const tools = buildAiTools({ tasks, members });
    const output = await tools.updateTask.execute(
      { taskId: "unknown", memo: "更新メモ" },
      executionOptions,
    );
    expect(output).toMatchObject({ type: "error" });
  });

  it("completeTask: 存在するタスクのdoneを返す", async () => {
    const tools = buildAiTools({ tasks, members });
    const output = await tools.completeTask.execute(
      { taskId: "t-1", done: true },
      executionOptions,
    );
    expect(output).toEqual({ type: "completeTask", taskId: "t-1", done: true });
  });

  it("completeTask: 存在しないタスクidはエラーを返す", async () => {
    const tools = buildAiTools({ tasks, members });
    const output = await tools.completeTask.execute(
      { taskId: "unknown", done: true },
      executionOptions,
    );
    expect(output).toMatchObject({ type: "error" });
  });

  it("proposeTasks: introとtitlesをそのまま返す（追加は行わない）", async () => {
    const tools = buildAiTools({ tasks, members });
    const output = await tools.proposeTasks.execute(
      { intro: "5件提案します", titles: ["a", "b", "c"] },
      executionOptions,
    );
    expect(output).toEqual({
      type: "proposeTasks",
      intro: "5件提案します",
      titles: ["a", "b", "c"],
    });
  });
});

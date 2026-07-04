import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `app/api/ai/**` の Route Handler ユニットテスト。
 *
 * AI呼び出し（`ai`の`generateText`・`@/lib/ai/model`）と Clerk（`auth`・
 * `@/lib/ai/api-key`）をモックし、実APIキー無しで検証する
 * （`docs/backend-implementation-plan.md` セクション5の完了条件）。
 */
vi.mock("@/lib/ai/api-key", () => ({
  getAiApiKey: vi.fn(),
  setAiApiKey: vi.fn(),
}));
vi.mock("@/lib/ai/model", () => ({
  createAiModel: vi.fn(() => ({ modelId: "fake-model" })),
  getAiModelConfig: vi.fn(() => ({
    provider: "gemini",
    id: "gemini-flash-latest",
    maxContextTokens: 1048576,
  })),
}));
vi.mock("ai", () => ({
  generateText: vi.fn(),
  stepCountIs: vi.fn(() => "stepCountIs-stub"),
  // `buildAiTools`（`lib/ai/tools.ts`）が呼ぶ。本テストでは `generateText` 自体を
  // モックしているため実際にツールが実行されることはなく、定義をそのまま返せば十分。
  tool: vi.fn((definition) => definition),
}));
vi.mock("@/lib/api/auth", () => ({
  requireOrgId: vi.fn(async () => ({ ok: true, orgId: "org_test" })),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user_1", orgId: "org_test" })),
}));

import { generateText } from "ai";

import * as apiKeyLib from "@/lib/ai/api-key";
import { AI_NO_API_KEY_MESSAGE } from "@/lib/labels";
import type { Member, Project } from "@/lib/schema";

import { GET, PUT, DELETE } from "@/app/api/ai/api-key/route";
import { POST as POST_SUMMARY } from "@/app/api/ai/summary/route";
import { POST as POST_CHAT } from "@/app/api/ai/chat/route";

const asMock = <T extends (...args: never[]) => unknown>(fn: T) =>
  vi.mocked(fn);

const project: Project = {
  id: "p-1",
  name: "モバイルアプリ新機能開発",
  categoryId: "cat-1",
  status: "inProgress",
  deadline: "2026-08-01",
  tasks: [
    {
      id: "t-1",
      title: "要件定義",
      done: false,
      dueDate: "2026-07-10",
      assigneeId: "m-1",
      memo: "",
    },
  ],
};

const members: Member[] = [{ id: "m-1", name: "佐藤 健太", role: "owner" }];

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/ai", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/ai/api-key", () => {
  it("APIキーが設定済みなら configured: true を返す", async () => {
    asMock(apiKeyLib.getAiApiKey).mockResolvedValue("AIza-xxx");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: true });
  });

  it("APIキー未設定なら configured: false を返す", async () => {
    asMock(apiKeyLib.getAiApiKey).mockResolvedValue(null);
    const res = await GET();
    expect(await res.json()).toEqual({ configured: false });
  });
});

describe("PUT /api/ai/api-key", () => {
  it("APIキーを保存する", async () => {
    const res = await PUT(jsonRequest({ apiKey: "AIza-xxx" }));
    expect(apiKeyLib.setAiApiKey).toHaveBeenCalledWith("user_1", "AIza-xxx");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: true });
  });

  it("空のAPIキーはバリデーションエラー(400)になる", async () => {
    const res = await PUT(jsonRequest({ apiKey: "" }));
    expect(res.status).toBe(400);
    expect(apiKeyLib.setAiApiKey).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/ai/api-key", () => {
  it("空文字を保存してキーを削除する", async () => {
    const res = await DELETE();
    expect(apiKeyLib.setAiApiKey).toHaveBeenCalledWith("user_1", "");
    expect(await res.json()).toEqual({ configured: false });
  });
});

describe("POST /api/ai/summary", () => {
  it("APIキー未設定なら Gemini を呼ばずフォールバック文言を返す", async () => {
    asMock(apiKeyLib.getAiApiKey).mockResolvedValue(null);
    const res = await POST_SUMMARY(
      jsonRequest({ project, categoryName: "プロダクト開発" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      source: "fallback",
      summary: AI_NO_API_KEY_MESSAGE,
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("APIキー設定済みなら Gemini の応答をそのまま返す", async () => {
    asMock(apiKeyLib.getAiApiKey).mockResolvedValue("AIza-xxx");
    asMock(generateText).mockResolvedValue({ text: "  順調です。  " } as never);

    const res = await POST_SUMMARY(
      jsonRequest({ project, categoryName: "プロダクト開発" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      source: "gemini",
      summary: "順調です。",
    });
  });

  it("Gemini呼び出しが失敗したら502を返す", async () => {
    asMock(apiKeyLib.getAiApiKey).mockResolvedValue("AIza-xxx");
    asMock(generateText).mockRejectedValue(new Error("boom"));

    const res = await POST_SUMMARY(
      jsonRequest({ project, categoryName: "プロダクト開発" }),
    );
    expect(res.status).toBe(502);
  });

  it("不正なリクエストボディは400を返す", async () => {
    const res = await POST_SUMMARY(jsonRequest({ project: {} }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/ai/chat", () => {
  const chatBody = {
    project,
    categoryName: "プロダクト開発",
    members,
    history: [],
    message: "要件定義を完了にして",
  };

  it("APIキー未設定なら Gemini を呼ばずフォールバック案内を返す", async () => {
    asMock(apiKeyLib.getAiApiKey).mockResolvedValue(null);
    const res = await POST_CHAT(jsonRequest(chatBody));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("fallback");
    expect(body.reply).toEqual({
      kind: "text",
      content: AI_NO_API_KEY_MESSAGE,
    });
    expect(body.actions).toEqual([]);
    expect(body.usage).toBeNull();
    expect(body.model).toEqual({
      provider: "gemini",
      id: "gemini-flash-latest",
      maxContextTokens: 1048576,
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("tool callingの結果をactionsに変換し、テキスト応答をそのまま返す", async () => {
    asMock(apiKeyLib.getAiApiKey).mockResolvedValue("AIza-xxx");
    asMock(generateText).mockResolvedValue({
      text: "「要件定義」を完了にしました。",
      toolResults: [
        {
          toolName: "completeTask",
          output: { type: "completeTask", taskId: "t-1", done: true },
        },
      ],
      usage: { inputTokens: 20, outputTokens: 5, totalTokens: 25 },
    } as never);

    const res = await POST_CHAT(jsonRequest(chatBody));
    const body = await res.json();

    expect(body.source).toBe("gemini");
    expect(body.reply).toEqual({
      kind: "text",
      content: "「要件定義」を完了にしました。",
    });
    expect(body.actions).toEqual([
      { type: "completeTask", taskId: "t-1", done: true },
    ]);
    expect(body.usage).toEqual({
      inputTokens: 20,
      outputTokens: 5,
      totalTokens: 25,
    });
    expect(body.model).toEqual({
      provider: "gemini",
      id: "gemini-flash-latest",
      maxContextTokens: 1048576,
    });
  });

  it("proposeTasksの結果はtaskProposal形式で返し、actionsには含めない", async () => {
    asMock(apiKeyLib.getAiApiKey).mockResolvedValue("AIza-xxx");
    asMock(generateText).mockResolvedValue({
      text: "",
      toolResults: [
        {
          toolName: "proposeTasks",
          output: {
            type: "proposeTasks",
            intro: "3件提案します",
            titles: ["a", "b", "c"],
          },
        },
      ],
    } as never);

    const res = await POST_CHAT(jsonRequest(chatBody));
    const body = await res.json();

    expect(body.reply).toEqual({
      kind: "taskProposal",
      intro: "3件提案します",
      titles: ["a", "b", "c"],
    });
    expect(body.actions).toEqual([]);
  });

  it("エラー扱いのtool結果はactionsから除外する", async () => {
    asMock(apiKeyLib.getAiApiKey).mockResolvedValue("AIza-xxx");
    asMock(generateText).mockResolvedValue({
      text: "見つかりませんでした。",
      toolResults: [
        {
          toolName: "updateTask",
          output: { type: "error", message: "not found" },
        },
      ],
    } as never);

    const res = await POST_CHAT(jsonRequest(chatBody));
    const body = await res.json();
    expect(body.actions).toEqual([]);
  });

  it("Gemini呼び出しが失敗したら502を返す", async () => {
    asMock(apiKeyLib.getAiApiKey).mockResolvedValue("AIza-xxx");
    asMock(generateText).mockRejectedValue(new Error("boom"));

    const res = await POST_CHAT(jsonRequest(chatBody));
    expect(res.status).toBe(502);
  });

  it("不正なリクエストボディは400を返す", async () => {
    const res = await POST_CHAT(jsonRequest({ message: "" }));
    expect(res.status).toBe(400);
  });
});

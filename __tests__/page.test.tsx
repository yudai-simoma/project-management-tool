import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { Category, Member, Project } from "@/lib/schema";

const categories: Category[] = [{ id: "cat-1", name: "プロダクト開発" }];
const members: Member[] = [{ id: "m-1", name: "佐藤 健太", role: "owner" }];
const projects: Project[] = [
  {
    id: "p-1",
    name: "モバイルアプリ新機能開発",
    categoryId: "cat-1",
    status: "inProgress",
    deadline: "",
    tasks: [],
  },
];

vi.mock("@/db/repositories/categories", () => ({
  listCategories: vi.fn(async () => categories),
}));
vi.mock("@/lib/clerk/org-members", () => ({
  listActiveMembers: vi.fn(async () => members),
}));
vi.mock("@/db/repositories/projects", () => ({
  listProjectsWithTasks: vi.fn(async () => projects),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ orgId: "org_test" })),
}));
// Pane 3 の `AiSummaryCard` がマウント時に実fetchを呼ばないよう、AI関連クライアントを
// スタブする（本テストはページ全体のスモークテストのため、AI機能自体の検証は
// `__tests__/api-ai.test.ts`・`__tests__/ai-tools.test.ts` に委ねる）。
vi.mock("@/lib/api/ai-client", () => ({
  fetchAiSummary: vi.fn(async () => ({ source: "fallback", summary: "" })),
  fetchApiKeyStatus: vi.fn(async () => ({ configured: false })),
  saveApiKeyApi: vi.fn(),
  clearApiKeyApi: vi.fn(),
  sendAiChatMessage: vi.fn(),
}));
// `Workspace` 配下の `GlobalHeader`/`OrgSwitcher`（Client Component）が使う Clerk の
// フック群。`<ClerkProvider>` 無しでレンダリングするため、本テストでは最小限のスタブを返す
// （組織・ユーザー情報自体の検証は `OrgSwitcher`/`GlobalHeader` 単体のテストで行う）。
vi.mock("@clerk/nextjs", () => ({
  useOrganization: () => ({
    isLoaded: false,
    organization: null,
    membership: null,
  }),
  useOrganizationList: () => ({
    isLoaded: false,
    userMemberships: { data: [] },
    setActive: undefined,
  }),
  useUser: () => ({ isLoaded: false, user: null }),
  useClerk: () => ({
    signOut: vi.fn(),
    openUserProfile: vi.fn(),
    openCreateOrganization: vi.fn(),
  }),
}));

// `Page` は async Server Component のため、`render(<Page />)` ではなく
// 先に `await Page()` で解決した要素を render に渡す。
import Page from "@/app/page";
import { auth } from "@clerk/nextjs/server";

describe("Page", () => {
  it("DB（リポジトリ層）・Clerk（メンバー）から初期データを取得し、Workspace をレンダリングできる", async () => {
    render(await Page());

    // ワークスペース名（Pane 1 ヘッダー、data/workspace.json 由来）
    expect(screen.getByText("プロジェクト管理")).toBeInTheDocument();

    // カテゴリ名（Pane 1 の InlineTextField）
    expect(screen.getByDisplayValue("プロダクト開発")).toBeInTheDocument();

    // プロジェクト一覧の見出し（Pane 2）
    expect(screen.getByText("プロジェクト一覧")).toBeInTheDocument();
  });

  it("組織未所属（orgId 無し）の場合は /onboarding へリダイレクトする（middleware をすり抜けた場合の防御）", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ orgId: null } as never);

    await expect(Page()).rejects.toMatchObject({
      digest: expect.stringContaining("/onboarding"),
    });
  });
});

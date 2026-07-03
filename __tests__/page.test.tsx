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
vi.mock("@/db/repositories/members", () => ({
  listMembers: vi.fn(async () => members),
}));
vi.mock("@/db/repositories/projects", () => ({
  listProjectsWithTasks: vi.fn(async () => projects),
}));

// `Page` は async Server Component のため、`render(<Page />)` ではなく
// 先に `await Page()` で解決した要素を render に渡す。
import Page from "@/app/page";

describe("Page", () => {
  it("DB（リポジトリ層）から初期データを取得し、Workspace をレンダリングできる", async () => {
    render(await Page());

    // ワークスペース名（Pane 1 ヘッダー、data/workspace.json 由来）
    expect(screen.getByText("プロジェクト管理")).toBeInTheDocument();

    // カテゴリ名（Pane 1 のグループ見出し等、複数箇所に表示されるため
    // getAllByText で存在確認する）
    expect(screen.getAllByText("プロダクト開発").length).toBeGreaterThan(0);

    // プロジェクト一覧の見出し（Pane 2）
    expect(screen.getByText("プロジェクト一覧")).toBeInTheDocument();
  });
});

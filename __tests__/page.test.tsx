import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import Page from "@/app/page";

describe("Page", () => {
  it("data/*.json を読み込み、Workspace をレンダリングできる", () => {
    render(<Page />);

    // ワークスペース名（Pane 1 ヘッダー）
    expect(screen.getByText("プロジェクト管理")).toBeInTheDocument();

    // カテゴリ名（Pane 1 のグループ見出し、パンくず、Pane 3 概要ヘッダー等
    // 複数箇所に表示されるため getAllByText で存在確認する）
    expect(screen.getAllByText("プロダクト開発").length).toBeGreaterThan(0);

    // プロジェクト一覧の見出し（Pane 2）
    expect(screen.getByText("プロジェクト一覧")).toBeInTheDocument();
  });
});

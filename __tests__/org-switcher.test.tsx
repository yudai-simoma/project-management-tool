import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * `OrgSwitcher`（GlobalHeader 左端の組織切替UI）のユニットテスト。
 *
 * Clerk の `useOrganization`/`useOrganizationList`/`useClerk` フックをモックし、
 * 実際の組織名・ロールバッジの表示、組織切替（`setActive`）、新規作成モーダルを開く
 * （`openCreateOrganization`）の呼び出しを検証する（`docs/backend-implementation-plan.md`
 * セクション3のテスト方針。ダミー定数からClerk実データへの置き換えの確認）。
 */

const setActive = vi.fn();
const openCreateOrganization = vi.fn();

const useOrganizationMock = vi.fn();
const useOrganizationListMock = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useOrganization: () => useOrganizationMock(),
  useOrganizationList: () => useOrganizationListMock(),
  useClerk: () => ({ openCreateOrganization }),
}));

import { OrgSwitcher } from "@/components/workspace/OrgSwitcher";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OrgSwitcher", () => {
  it("読み込み中は組織名を表示しない", () => {
    useOrganizationMock.mockReturnValue({
      isLoaded: false,
      organization: null,
      membership: null,
    });
    useOrganizationListMock.mockReturnValue({
      isLoaded: false,
      userMemberships: { data: [] },
      setActive,
    });

    render(<OrgSwitcher />);

    expect(screen.getByText("読み込み中…")).toBeInTheDocument();
  });

  it("現在の組織名と、Clerkのカスタムロール（org:owner）から変換したロールラベルを表示する", () => {
    useOrganizationMock.mockReturnValue({
      isLoaded: true,
      organization: { id: "org_1", name: "アクメ株式会社" },
      membership: { role: "org:owner" },
    });
    useOrganizationListMock.mockReturnValue({
      isLoaded: true,
      userMemberships: {
        data: [
          {
            organization: { id: "org_1", name: "アクメ株式会社" },
            role: "org:owner",
          },
          {
            organization: { id: "org_2", name: "べつの組織" },
            role: "org:member",
          },
        ],
      },
      setActive,
    });

    render(<OrgSwitcher />);

    expect(screen.getByText("アクメ株式会社")).toBeInTheDocument();
    expect(screen.getByText("オーナー")).toBeInTheDocument();
  });

  it("組織切り替えメニューから別の組織を選ぶと setActive が呼ばれる", () => {
    useOrganizationMock.mockReturnValue({
      isLoaded: true,
      organization: { id: "org_1", name: "アクメ株式会社" },
      membership: { role: "org:admin" },
    });
    useOrganizationListMock.mockReturnValue({
      isLoaded: true,
      userMemberships: {
        data: [
          {
            organization: { id: "org_1", name: "アクメ株式会社" },
            role: "org:admin",
          },
          {
            organization: { id: "org_2", name: "べつの組織" },
            role: "org:member",
          },
        ],
      },
      setActive,
    });

    render(<OrgSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "組織を切り替え" }));
    fireEvent.click(screen.getByText("べつの組織"));

    expect(setActive).toHaveBeenCalledWith({ organization: "org_2" });
  });

  it("「組織を新規作成」を選ぶと openCreateOrganization が呼ばれる", () => {
    useOrganizationMock.mockReturnValue({
      isLoaded: true,
      organization: { id: "org_1", name: "アクメ株式会社" },
      membership: { role: "org:member" },
    });
    useOrganizationListMock.mockReturnValue({
      isLoaded: true,
      userMemberships: {
        data: [
          {
            organization: { id: "org_1", name: "アクメ株式会社" },
            role: "org:member",
          },
        ],
      },
      setActive,
    });

    render(<OrgSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "組織を切り替え" }));
    fireEvent.click(screen.getByText("組織を新規作成"));

    expect(openCreateOrganization).toHaveBeenCalled();
  });
});

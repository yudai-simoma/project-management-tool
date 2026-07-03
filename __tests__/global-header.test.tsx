import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * `GlobalHeader` のユーザーメニュー（Avatar + DropdownMenu）のユニットテスト。
 *
 * `OrgSwitcher` は別ファイル（`__tests__/org-switcher.test.tsx`）で個別に検証済みのため、
 * ここでは最小限のスタブに差し替え、`useUser`/`useClerk`（Clerk実データ・
 * signOut/openUserProfile接続）に絞って検証する。
 */

const signOut = vi.fn();
const openUserProfile = vi.fn();
const useUserMock = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useUser: () => useUserMock(),
  useClerk: () => ({ signOut, openUserProfile }),
}));
vi.mock("@/components/workspace/OrgSwitcher", () => ({
  OrgSwitcher: () => <div data-testid="org-switcher-stub" />,
}));

import { GlobalHeader } from "@/components/workspace/GlobalHeader";

const baseProps = {
  categoryName: "プロダクト開発",
  projectName: "モバイルアプリ新機能開発",
  categories: [],
  onAddCategory: vi.fn(),
  onDeleteCategory: vi.fn(),
  mainView: "workspace" as const,
  onMainViewChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GlobalHeader のユーザーメニュー", () => {
  it("Clerkのユーザー名の頭文字をAvatarのフォールバックに表示する", () => {
    useUserMock.mockReturnValue({
      isLoaded: true,
      user: {
        fullName: "佐藤 健太",
        imageUrl: "",
        primaryEmailAddress: { emailAddress: "sato@example.com" },
      },
    });

    render(<GlobalHeader {...baseProps} />);

    expect(screen.getByText("佐")).toBeInTheDocument();
  });

  it("「プロフィール」を選ぶと openUserProfile が呼ばれる", () => {
    useUserMock.mockReturnValue({
      isLoaded: true,
      user: {
        fullName: "佐藤 健太",
        imageUrl: "",
        primaryEmailAddress: { emailAddress: "sato@example.com" },
      },
    });

    render(<GlobalHeader {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "ユーザーメニュー" }));
    fireEvent.click(screen.getByText("プロフィール"));

    expect(openUserProfile).toHaveBeenCalled();
  });

  it("「ログアウト」を選ぶと signOut が /sign-in へのリダイレクト指定付きで呼ばれる", () => {
    useUserMock.mockReturnValue({
      isLoaded: true,
      user: {
        fullName: "佐藤 健太",
        imageUrl: "",
        primaryEmailAddress: { emailAddress: "sato@example.com" },
      },
    });

    render(<GlobalHeader {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "ユーザーメニュー" }));
    fireEvent.click(screen.getByText("ログアウト"));

    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/sign-in" });
  });
});

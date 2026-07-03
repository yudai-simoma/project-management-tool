import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * `MemberManagementSection` のユニットテスト。
 *
 * `lib/api/members-client`（Clerk Organizations API を叩く fetch ラッパー）を
 * モックし、実Clerk接続なしで一覧表示・招待・削除・招待取り消しの導線を検証する。
 */
vi.mock("@/lib/api/members-client", () => ({
  fetchOrgMembers: vi.fn(),
  inviteMemberApi: vi.fn(),
  updateMemberRoleApi: vi.fn(),
  removeMemberApi: vi.fn(),
  revokeInvitationApi: vi.fn(),
}));

const useOrganizationMock = vi.fn();
vi.mock("@clerk/nextjs", () => ({
  useOrganization: () => useOrganizationMock(),
}));

import * as membersClient from "@/lib/api/members-client";
import { MemberManagementSection } from "@/components/workspace/MemberManagementSection";

const asMock = <T extends (...args: never[]) => unknown>(fn: T) =>
  vi.mocked(fn);

beforeEach(() => {
  vi.clearAllMocks();
  // 既定は Owner/Admin（操作可能）。「Member は操作できない」ケースは個別テストで上書きする。
  useOrganizationMock.mockReturnValue({ membership: { role: "org:admin" } });
  asMock(membersClient.fetchOrgMembers).mockResolvedValue({
    members: [
      {
        id: "user_1",
        name: "佐藤 健太",
        email: "sato@example.com",
        role: "owner",
      },
    ],
    invitations: [
      { id: "orginv_1", email: "pending@example.com", role: "member" },
    ],
  });
});

describe("MemberManagementSection", () => {
  it("マウント時にメンバー一覧・招待中一覧を取得して表示する", async () => {
    render(<MemberManagementSection />);

    expect(await screen.findByText("佐藤 健太")).toBeInTheDocument();
    expect(screen.getByText("sato@example.com")).toBeInTheDocument();
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    expect(membersClient.fetchOrgMembers).toHaveBeenCalledTimes(1);
  });

  it("メールアドレスを入力して招待すると inviteMemberApi が呼ばれ、招待中一覧に追加される", async () => {
    asMock(membersClient.inviteMemberApi).mockResolvedValue({
      id: "orginv_2",
      email: "new@example.com",
      role: "member",
    });

    render(<MemberManagementSection />);
    await screen.findByText("佐藤 健太");

    fireEvent.change(screen.getByPlaceholderText("メールアドレスで招待"), {
      target: { value: "new@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "招待" }));

    await waitFor(() =>
      expect(membersClient.inviteMemberApi).toHaveBeenCalledWith({
        email: "new@example.com",
        role: "member",
      }),
    );
    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
  });

  it("招待の取り消しボタンで revokeInvitationApi が呼ばれ、一覧から消える", async () => {
    asMock(membersClient.revokeInvitationApi).mockResolvedValue(undefined);

    render(<MemberManagementSection />);
    await screen.findByText("pending@example.com");

    fireEvent.click(
      screen.getByRole("button", {
        name: "pending@example.com への招待を取り消す",
      }),
    );

    await waitFor(() =>
      expect(membersClient.revokeInvitationApi).toHaveBeenCalledWith(
        "orginv_1",
      ),
    );
    expect(screen.queryByText("pending@example.com")).not.toBeInTheDocument();
  });

  it("削除ボタン→確認ダイアログの確定で removeMemberApi が呼ばれ、一覧から消える", async () => {
    asMock(membersClient.removeMemberApi).mockResolvedValue(undefined);

    render(<MemberManagementSection />);
    await screen.findByText("佐藤 健太");

    fireEvent.click(screen.getByRole("button", { name: "佐藤 健太 を削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() =>
      expect(membersClient.removeMemberApi).toHaveBeenCalledWith("user_1"),
    );
    expect(screen.queryByText("佐藤 健太")).not.toBeInTheDocument();
  });

  it("Memberロールでは削除ボタン・ロール変更・招待取り消しがdisabledになる（§6決定）", async () => {
    useOrganizationMock.mockReturnValue({ membership: { role: "org:member" } });

    render(<MemberManagementSection />);
    await screen.findByText("佐藤 健太");

    expect(
      screen.getByRole("button", { name: "佐藤 健太 を削除" }),
    ).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "佐藤 健太 のロール" })).toHaveAttribute(
      "data-disabled",
    );
    expect(
      screen.getByRole("button", {
        name: "pending@example.com への招待を取り消す",
      }),
    ).toBeDisabled();
  });
});

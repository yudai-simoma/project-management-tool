import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * `AdminApprovalDashboard`（`/admin`）のユニットテスト。
 * `lib/api/admin-client`（承認状態更新の fetch ラッパー）をモックし、
 * 実API接続なしで一覧の振り分け・承認/却下/利用停止/差し戻しの導線を検証する。
 */
vi.mock("@/lib/api/admin-client", () => ({
  updateApprovalStatusApi: vi.fn(),
}));

import * as adminClient from "@/lib/api/admin-client";
import { AdminApprovalDashboard } from "@/components/admin/AdminApprovalDashboard";
import type { PlatformUserSummary } from "@/lib/clerk/platform-users";

const asMock = <T extends (...args: never[]) => unknown>(fn: T) =>
  vi.mocked(fn);

const USERS: PlatformUserSummary[] = [
  {
    id: "user_pending",
    name: "承認待ち太郎",
    email: "pending@example.com",
    approvalStatus: "pending",
    createdAt: 0,
  },
  {
    id: "user_approved",
    name: "承認済み花子",
    email: "approved@example.com",
    approvalStatus: "approved",
    createdAt: 0,
  },
  {
    id: "user_rejected",
    name: "却下次郎",
    email: "rejected@example.com",
    approvalStatus: "rejected",
    createdAt: 0,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  asMock(adminClient.updateApprovalStatusApi).mockResolvedValue({
    id: "user_1",
    status: "approved",
  });
});

describe("AdminApprovalDashboard", () => {
  it("承認状態ごとに一覧を振り分けて表示する", () => {
    render(<AdminApprovalDashboard initialUsers={USERS} />);

    expect(screen.getByText("承認待ち太郎")).toBeInTheDocument();
    expect(screen.getByText("承認済み花子")).toBeInTheDocument();
    expect(screen.getByText("却下次郎")).toBeInTheDocument();
  });

  it("承認待ちユーザーの「承認」を押すと承認済みへ移動し、APIが呼ばれる", () => {
    render(<AdminApprovalDashboard initialUsers={USERS} />);

    fireEvent.click(screen.getByRole("button", { name: "承認" }));

    expect(adminClient.updateApprovalStatusApi).toHaveBeenCalledWith(
      "user_pending",
      "approved",
    );
  });

  it("承認待ちユーザーの「却下」を押すと却下済みへ移動し、APIが呼ばれる", () => {
    render(<AdminApprovalDashboard initialUsers={USERS} />);

    fireEvent.click(screen.getByRole("button", { name: "却下" }));

    expect(adminClient.updateApprovalStatusApi).toHaveBeenCalledWith(
      "user_pending",
      "rejected",
    );
  });

  it("承認済みユーザーの「利用停止」を押すと rejected に更新される", () => {
    render(<AdminApprovalDashboard initialUsers={USERS} />);

    fireEvent.click(screen.getByRole("button", { name: "利用停止" }));

    expect(adminClient.updateApprovalStatusApi).toHaveBeenCalledWith(
      "user_approved",
      "rejected",
    );
  });

  it("却下済みユーザーの「承認に戻す」を押すと approved に更新される", () => {
    render(<AdminApprovalDashboard initialUsers={USERS} />);

    fireEvent.click(screen.getByRole("button", { name: "承認に戻す" }));

    expect(adminClient.updateApprovalStatusApi).toHaveBeenCalledWith(
      "user_rejected",
      "approved",
    );
  });

  it("各一覧が空の場合は空状態の文言を表示する", () => {
    render(<AdminApprovalDashboard initialUsers={[]} />);

    expect(
      screen.getByText("承認待ちのユーザーはいません"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("承認済みのユーザーはいません"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("却下・利用停止済みのユーザーはいません"),
    ).toBeInTheDocument();
  });
});

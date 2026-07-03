"use client";

/**
 * プラットフォーム管理者専用ページ（`/admin`）本体。
 * 承認待ち・承認済み・却下済み（利用停止済みを含む）のユーザーを一覧表示し、
 * 承認・却下・利用停止・承認への差し戻しを行う（`docs/feedback-implementation-plan.md`
 * ステップ1）。
 *
 * 「却下済み一覧」は元のスコープ（承認待ち一覧・承認済み一覧）には無いが、却下した
 * ユーザーがどの一覧にも表示されなくなる（＝取り消し手段がなくなる）状態を避けるため、
 * 実装判断として追加した。
 *
 * 一覧の更新は `Workspace.tsx` 等と同じ「即座にローカル state 反映 → 裏で API 呼び出し
 * → 失敗したら黙ってロールバック」という既存の楽観的更新方針（`lib/optimistic.ts`）を踏襲する。
 */

import { useState } from "react";
import { Ban, Check, RotateCcw, X } from "lucide-react";

import { updateApprovalStatusApi } from "@/lib/api/admin-client";
import type { ApprovalStatus } from "@/lib/auth/approval";
import type { PlatformUserSummary } from "@/lib/clerk/platform-users";
import { runOptimistic } from "@/lib/optimistic";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type AdminApprovalDashboardProps = {
  initialUsers: PlatformUserSummary[];
};

function UserList({
  users,
  emptyLabel,
  renderActions,
}: {
  users: PlatformUserSummary[];
  emptyLabel: string;
  renderActions: (user: PlatformUserSummary) => React.ReactNode;
}) {
  if (users.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ScrollArea className="max-h-72">
      <div className="divide-y divide-border rounded-lg border border-border">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between gap-2 px-3 py-2"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {renderActions(user)}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function AdminApprovalDashboard({
  initialUsers,
}: AdminApprovalDashboardProps) {
  const [users, setUsers] = useState(initialUsers);

  const updateStatus = (
    userId: string,
    status: Extract<ApprovalStatus, "approved" | "rejected">,
  ) => {
    const previous = users.find((u) => u.id === userId)?.approvalStatus;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, approvalStatus: status } : u)),
    );

    runOptimistic(
      () => updateApprovalStatusApi(userId, status),
      () => {
        if (!previous) return;
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, approvalStatus: previous } : u,
          ),
        );
      },
    );
  };

  const pending = users.filter((u) => u.approvalStatus === "pending");
  const approved = users.filter((u) => u.approvalStatus === "approved");
  const rejected = users.filter((u) => u.approvalStatus === "rejected");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-canvas px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">
          プラットフォーム管理
        </h1>
        <p className="text-sm text-muted-foreground">
          サインアップしたユーザーの利用承認を管理します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>承認待ち</CardTitle>
          <CardDescription>{pending.length}件</CardDescription>
        </CardHeader>
        <CardContent>
          <UserList
            users={pending}
            emptyLabel="承認待ちのユーザーはいません"
            renderActions={(user) => (
              <>
                <Button size="sm" onClick={() => updateStatus(user.id, "approved")}>
                  <Check data-icon="inline-start" />
                  承認
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(user.id, "rejected")}
                >
                  <X data-icon="inline-start" />
                  却下
                </Button>
              </>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>承認済み</CardTitle>
          <CardDescription>{approved.length}件</CardDescription>
        </CardHeader>
        <CardContent>
          <UserList
            users={approved}
            emptyLabel="承認済みのユーザーはいません"
            renderActions={(user) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus(user.id, "rejected")}
              >
                <Ban data-icon="inline-start" />
                利用停止
              </Button>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>却下・利用停止済み</CardTitle>
          <CardDescription>{rejected.length}件</CardDescription>
        </CardHeader>
        <CardContent>
          <UserList
            users={rejected}
            emptyLabel="却下・利用停止済みのユーザーはいません"
            renderActions={(user) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus(user.id, "approved")}
              >
                <RotateCcw data-icon="inline-start" />
                承認に戻す
              </Button>
            )}
          />
        </CardContent>
      </Card>
    </main>
  );
}

"use client";

/**
 * 組織スイッチャー（GlobalHeader 左端）。
 *
 * 「組織ごとに別々のワークスペースに分かれ、そのワークスペース内で3段階の
 * ロール（Owner/Admin/Member）を持つ」という決定（`docs/mock-implementation-plan.md`
 * §2.4）に基づく。バックエンドフェーズ（セクション3）で Clerk Organizations に接続し、
 * ダミー定数（`DUMMY_ORGS`）を実データに置き換えた。組織を切り替えると
 * `setActive` でセッションのアクティブ組織が変わり、`proxy.ts`（旧 `middleware.ts`）のスコープに従って
 * 実際にワークスペースのデータ（カテゴリ/プロジェクト/タスク）が切り替わる。
 *
 * ロールは Clerk 標準の `org:admin`/`org:member` に加え、組織作成者に自動付与される
 * カスタムロール `org:owner` を含めた3段階（セクション3の実装メモ参照。Clerk標準では
 * Admin/Memberの2段階のみのため、Ownerはカスタムロールとして追加した）。
 */

import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useClerk, useOrganization, useOrganizationList } from "@clerk/nextjs";

import { type Role } from "@/lib/schema";
import { ROLE_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Clerk のロールキー（`org:owner` 等）を、アプリのドメイン型 `Role` に変換する。 */
function toRole(clerkRole: string | null | undefined): Role {
  const stripped = clerkRole?.replace(/^org:/, "");
  if (stripped === "owner" || stripped === "admin" || stripped === "member") {
    return stripped;
  }
  return "member";
}

export function OrgSwitcher() {
  const { organization, membership, isLoaded: isOrgLoaded } = useOrganization();
  const {
    userMemberships,
    setActive,
    isLoaded: isListLoaded,
  } = useOrganizationList({ userMemberships: { infinite: true } });
  const clerk = useClerk();

  if (!isOrgLoaded || !isListLoaded || !organization) {
    return (
      <div className="flex h-8 min-w-0 shrink-0 items-center gap-2 px-2">
        <Building2
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="text-sm text-muted-foreground">読み込み中…</span>
      </div>
    );
  }

  const activeRole = toRole(membership?.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="組織を切り替え"
            className="flex h-8 min-w-0 shrink-0 items-center gap-2 rounded-md px-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted"
          >
            <Building2
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="max-w-32 truncate text-sm font-medium text-foreground">
              {organization.name}
            </span>
            <Badge variant="secondary" size="xs" className="shrink-0">
              {ROLE_LABEL[activeRole]}
            </Badge>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        {userMemberships.data?.map((mem) => (
          <DropdownMenuItem
            key={mem.organization.id}
            onClick={() => setActive?.({ organization: mem.organization.id })}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate">{mem.organization.name}</span>
              <Badge variant="outline" size="xs" className="shrink-0">
                {ROLE_LABEL[toRole(mem.role)]}
              </Badge>
            </span>
            {mem.organization.id === organization.id && (
              <Check className="size-3.5 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => clerk.openCreateOrganization({})}>
          <Plus />
          組織を新規作成
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

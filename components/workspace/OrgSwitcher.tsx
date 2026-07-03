"use client";

/**
 * 組織スイッチャー（GlobalHeader 左端）。
 *
 * 「組織ごとに別々のワークスペースに分かれ、そのワークスペース内で3段階の
 * ロール（Owner/Admin/Member）を持つ」という決定（`docs/mock-implementation-plan.md`
 * §2.4）に基づく。モック段階のダミー実装（§2.7 決定）: ダミー定数で表示切替のみ行い、
 * 実データの絞り込みは発生しない（切り替えても Pane 1〜4 のプロジェクトデータは
 * 変わらない）。バックエンドフェーズで Clerk Organizations に置き換える想定。
 */

import { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";

import { type Role } from "@/lib/schema";
import { ROLE_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DummyOrg = {
  id: string;
  name: string;
  role: Role;
};

const DUMMY_ORGS: DummyOrg[] = [
  { id: "org1", name: "株式会社アルファテック", role: "owner" },
  { id: "org2", name: "ベータ物産株式会社", role: "member" },
];

export function OrgSwitcher() {
  const [activeOrgId, setActiveOrgId] = useState(DUMMY_ORGS[0].id);
  const activeOrg =
    DUMMY_ORGS.find((o) => o.id === activeOrgId) ?? DUMMY_ORGS[0];

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
              {activeOrg.name}
            </span>
            <Badge variant="secondary" size="xs" className="shrink-0">
              {ROLE_LABEL[activeOrg.role]}
            </Badge>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        {DUMMY_ORGS.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => setActiveOrgId(org.id)}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate">{org.name}</span>
              <Badge variant="outline" size="xs" className="shrink-0">
                {ROLE_LABEL[org.role]}
              </Badge>
            </span>
            {org.id === activeOrgId && (
              <Check className="size-3.5 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

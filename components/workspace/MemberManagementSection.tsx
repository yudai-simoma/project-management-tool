"use client";

/**
 * メンバー管理セクション（`SettingsDialogContent` のカテゴリ管理と同じダイアログ内に
 * 配置する）。Clerk Organizations 経由でメンバーの招待・削除・ロール変更を行う
 * （`docs/backend-implementation-plan.md` セクション4）。
 *
 * `SettingsDialogContent` が乗る `DialogContent` は base-ui の Dialog Portal が
 * `keepMounted: false`（既定）で開閉に応じて実際にマウント/アンマウントするため、
 * 本コンポーネントはダイアログが開くたびにマウントされ直す。そのため `open` prop を
 * 受け取らず、マウント時に一度だけ最新のメンバー・招待一覧を取得すればよい
 * （毎回開き直すと自然に最新化される）。
 */

import { useEffect, useState } from "react";
import { Mail, Trash2, X } from "lucide-react";
import { useOrganization } from "@clerk/nextjs";

import { type Role } from "@/lib/schema";
import { MANAGE_ROLE_TOOLTIP, ROLE_LABEL } from "@/lib/labels";
import { toRole } from "@/lib/auth/roles";
import { canManageOrg } from "@/lib/auth/permissions";
import type {
  InvitationSummary,
  MemberWithEmail,
} from "@/lib/clerk/org-members";
import {
  fetchOrgMembers,
  inviteMemberApi,
  removeMemberApi,
  revokeInvitationApi,
  updateMemberRoleApi,
} from "@/lib/api/members-client";
import { runOptimistic, removeById } from "@/lib/optimistic";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ROLE_OPTIONS: readonly Role[] = ["owner", "admin", "member"];

function RoleSelect({
  value,
  onValueChange,
  ariaLabel,
  disabled,
}: {
  value: Role;
  onValueChange: (role: Role) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as Role)}
      disabled={disabled}
    >
      <SelectTrigger size="sm" aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {ROLE_OPTIONS.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABEL[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MemberManagementSection() {
  // メンバーの招待・削除・ロール変更は Owner/Admin のみ許可する（§6決定）。
  const { membership } = useOrganization();
  const canManage = canManageOrg(toRole(membership?.role));

  const [members, setMembers] = useState<MemberWithEmail[]>([]);
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOrgMembers()
      .then((result) => {
        if (cancelled) return;
        setMembers(result.members);
        setInvitations(result.invitations);
      })
      .catch((error: unknown) => {
        console.error("[members] メンバー一覧の取得に失敗しました", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteEmail("");

    inviteMemberApi({ email, role: inviteRole })
      .then((invitation) => {
        setInvitations((prev) => [...prev, invitation]);
      })
      .catch((error: unknown) => {
        console.error("[members] 招待に失敗しました", error);
      });
  };

  const handleRoleChange = (userId: string, role: Role) => {
    const previousRole = members.find((m) => m.id === userId)?.role;
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, role } : m)),
    );

    runOptimistic(
      () => updateMemberRoleApi(userId, role),
      () => {
        if (!previousRole) return;
        setMembers((prev) =>
          prev.map((m) => (m.id === userId ? { ...m, role: previousRole } : m)),
        );
      },
    );
  };

  const handleRemove = (userId: string) => {
    const removed = removeById(setMembers, userId);

    runOptimistic(
      () => removeMemberApi(userId),
      () => {
        if (removed) {
          setMembers((prev) => [
            ...prev.slice(0, removed.index),
            removed.item,
            ...prev.slice(removed.index),
          ]);
        }
      },
    );
  };

  const handleRevoke = (invitationId: string) => {
    const removed = removeById(setInvitations, invitationId);

    runOptimistic(
      () => revokeInvitationApi(invitationId),
      () => {
        if (removed) {
          setInvitations((prev) => [
            ...prev.slice(0, removed.index),
            removed.item,
            ...prev.slice(removed.index),
          ]);
        }
      },
    );
  };

  return (
    <>
      <Field>
        <FieldLabel>メンバー</FieldLabel>
        <ScrollArea className="max-h-48">
          <div className="divide-y divide-border rounded-lg border border-border">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">{member.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <RoleSelect
                          value={member.role}
                          onValueChange={(role) =>
                            handleRoleChange(member.id, role)
                          }
                          ariaLabel={`${member.name} のロール`}
                          disabled={!canManage}
                        />
                      }
                    />
                    {!canManage && (
                      <TooltipContent side="top">
                        {MANAGE_ROLE_TOOLTIP}
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={!canManage}
                          onClick={() =>
                            setRemoveTarget({
                              id: member.id,
                              name: member.name,
                            })
                          }
                          aria-label={`${member.name} を削除`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      }
                    />
                    {!canManage && (
                      <TooltipContent side="top">
                        {MANAGE_ROLE_TOOLTIP}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </div>
            ))}
            {!loading && members.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                メンバーがいません
              </div>
            )}
            {loading && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                読み込み中...
              </div>
            )}
          </div>
        </ScrollArea>

        {invitations.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">招待中</span>
            <div className="divide-y divide-border rounded-lg border border-border">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <span className="truncate text-sm text-muted-foreground">
                    {invitation.email}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant="outline" size="xs">
                      {ROLE_LABEL[invitation.role]}
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={!canManage}
                            onClick={() => handleRevoke(invitation.id)}
                            aria-label={`${invitation.email} への招待を取り消す`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X />
                          </Button>
                        }
                      />
                      {!canManage && (
                        <TooltipContent side="top">
                          {MANAGE_ROLE_TOOLTIP}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <InputGroup>
          <InputGroupInput
            type="email"
            placeholder="メールアドレスで招待"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleInvite();
            }}
          />
          <InputGroupAddon align="inline-end">
            <RoleSelect
              value={inviteRole}
              onValueChange={setInviteRole}
              ariaLabel="招待するロール"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInvite}
              disabled={!inviteEmail.trim()}
            >
              <Mail data-icon="inline-start" />
              招待
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </Field>

      <DeleteConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="メンバーを削除しますか？"
        itemName={removeTarget?.name ?? ""}
        description={`「${removeTarget?.name ?? ""}」を組織から削除します。担当していたタスクは未アサイン扱いとして表示されます。`}
        onConfirm={() => {
          if (removeTarget) {
            handleRemove(removeTarget.id);
            setRemoveTarget(null);
          }
        }}
      />
    </>
  );
}

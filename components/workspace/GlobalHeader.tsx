"use client";

import { useState } from "react";
import { KeyRound, LogOut, Settings, User } from "lucide-react";

import { type Category, type MainView } from "@/lib/schema";
import { MAIN_VIEW_LABEL } from "@/lib/labels";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiKeySettingsDialog } from "@/components/workspace/ApiKeySettingsDialog";
import { OrgSwitcher } from "@/components/workspace/OrgSwitcher";
import { SettingsDialogContent } from "@/components/workspace/SettingsDialog";

type GlobalHeaderProps = {
  categoryName: string;
  projectName: string;
  categories: Category[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  mainView: MainView;
  onMainViewChange: (view: MainView) => void;
};

/**
 * ユーザーメニュー（Avatar + DropdownMenu）。
 *
 * 「Gemini APIキー設定」から `ApiKeySettingsDialog` を開く（§2.5, §6.3 決定）。
 * 「プロフィール」「ログアウト」はダミーの no-op 項目（バックエンドフェーズで実装）。
 */
function UserMenu() {
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="ユーザーメニュー"
              className="flex shrink-0 items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Avatar size="sm">
                <AvatarFallback>ユ</AvatarFallback>
              </Avatar>
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>アカウント</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setApiKeyDialogOpen(true)}>
            <KeyRound />
            Gemini APIキー設定
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => {}}>
            <User />
            プロフィール
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => {}}>
            <LogOut />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ApiKeySettingsDialog
        open={apiKeyDialogOpen}
        onOpenChange={setApiKeyDialogOpen}
      />
    </>
  );
}

export function GlobalHeader({
  categoryName,
  projectName,
  categories,
  onAddCategory,
  onDeleteCategory,
  mainView,
  onMainViewChange,
}: GlobalHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <OrgSwitcher />

      <Tabs
        value={mainView}
        onValueChange={(v) => onMainViewChange(v as MainView)}
        className="shrink-0"
      >
        <TabsList>
          <TabsTrigger value="workspace">
            {MAIN_VIEW_LABEL.workspace}
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            {MAIN_VIEW_LABEL.dashboard}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mainView === "workspace" && (
        <Breadcrumb
          className="min-w-0 flex-1 overflow-hidden"
          aria-label="パンくず"
        >
          <BreadcrumbList className="flex-nowrap text-[11px]">
            <BreadcrumbItem className="shrink-0">
              <BreadcrumbLink>{categoryName}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate font-medium">
                {projectName}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {mainView === "dashboard" && <div className="min-w-0 flex-1" />}

      <Dialog>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="ワークスペース設定"
                  >
                    <Settings />
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">ワークスペース設定</TooltipContent>
        </Tooltip>
        <SettingsDialogContent
          categories={categories}
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory}
        />
      </Dialog>

      <UserMenu />
    </header>
  );
}

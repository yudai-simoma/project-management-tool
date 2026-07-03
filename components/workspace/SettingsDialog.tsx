"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { type Category } from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { MemberManagementSection } from "@/components/workspace/MemberManagementSection";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MANAGE_ROLE_TOOLTIP } from "@/lib/labels";

type SettingsDialogContentProps = {
  categories: Category[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  /** カテゴリ削除はOwner/Adminのみ許可する（§6決定）。 */
  canDeleteCategory: boolean;
};

export function SettingsDialogContent({
  categories,
  onAddCategory,
  onDeleteCategory,
  canDeleteCategory,
}: SettingsDialogContentProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setNewCategoryName("");
  };

  return (
    <>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ワークスペース設定</DialogTitle>
          <DialogDescription>
            プロジェクトカテゴリ・メンバー・ワークスペース名を管理します
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-new-category">
              プロジェクトカテゴリ
            </FieldLabel>
            <ScrollArea className="max-h-48">
              <div className="divide-y divide-border rounded-lg border border-border">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm">{category.name}</span>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={!canDeleteCategory}
                            onClick={() =>
                              setDeleteCategoryTarget({
                                id: category.id,
                                name: category.name,
                              })
                            }
                            aria-label={`${category.name} を削除`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        }
                      />
                      {!canDeleteCategory && (
                        <TooltipContent side="top">
                          {MANAGE_ROLE_TOOLTIP}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    カテゴリがありません
                  </div>
                )}
              </div>
            </ScrollArea>
            <InputGroup>
              <InputGroupInput
                id="settings-new-category"
                placeholder="新しいカテゴリ名"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                }}
              />
              <InputGroupAddon align="inline-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                >
                  <Plus data-icon="inline-start" />
                  追加
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Separator />

          <MemberManagementSection />

          <Separator />

          <Field>
            <FieldLabel htmlFor="settings-workspace-name">
              ワークスペース名
            </FieldLabel>
            <Input
              id="settings-workspace-name"
              defaultValue="プロジェクト管理"
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">閉じる</Button>} />
        </DialogFooter>
      </DialogContent>

      <DeleteConfirmDialog
        open={deleteCategoryTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCategoryTarget(null);
        }}
        title="カテゴリを削除しますか？"
        itemName={deleteCategoryTarget?.name ?? ""}
        description={`「${deleteCategoryTarget?.name ?? ""}」を削除します。配下のプロジェクトも含めて完全に削除され、元に戻せません。`}
        onConfirm={() => {
          if (deleteCategoryTarget) {
            onDeleteCategory(deleteCategoryTarget.id);
            setDeleteCategoryTarget(null);
          }
        }}
      />
    </>
  );
}

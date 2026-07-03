"use client";

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
import { Separator } from "@/components/ui/separator";

export function SettingsDialogContent() {
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>ワークスペース設定</DialogTitle>
        <DialogDescription>
          メンバー・ワークスペース名を管理します
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <MemberManagementSection />

        <Separator />

        <Field>
          <FieldLabel htmlFor="settings-workspace-name">
            ワークスペース名
          </FieldLabel>
          <Input id="settings-workspace-name" defaultValue="プロジェクト管理" />
        </Field>
      </FieldGroup>

      <DialogFooter>
        <DialogClose render={<Button variant="outline">閉じる</Button>} />
      </DialogFooter>
    </DialogContent>
  );
}

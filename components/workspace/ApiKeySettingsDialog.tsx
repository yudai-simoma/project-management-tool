"use client";

/**
 * Gemini APIキー設定ダイアログ。
 *
 * BYOK（Bring Your Own Key）方針のモック実装（`docs/mock-implementation-plan.md`
 * §2.5 決定）。入力値はこのコンポーネントのローカル state に保持するのみで、
 * 実際の永続化（Clerk private metadata への保存 API）は次フェーズで実装する。
 * 「保存」ボタンは成功表示のみ行う。
 */

import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

type ApiKeySettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApiKeySettingsDialog({
  open,
  onOpenChange,
}: ApiKeySettingsDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setSaved(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gemini APIキー設定</DialogTitle>
          <DialogDescription>
            AI機能はあなた個人のGemini APIキー（無料枠）で動作します（BYOK）。
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="gemini-api-key">APIキー</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <KeyRound />
              </InputGroupAddon>
              <InputGroupInput
                id="gemini-api-key"
                type={visible ? "text" : "password"}
                placeholder="AIza..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  aria-label={visible ? "APIキーを隠す" : "APIキーを表示"}
                  onClick={() => setVisible((v) => !v)}
                >
                  {visible ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              モック段階のため実際の保存は行われません（次フェーズで実装）。
            </FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter className="items-center sm:justify-between">
          {saved ? (
            <span className="flex items-center gap-1.5 text-sm text-primary">
              <Check className="size-4" />
              保存しました
            </span>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <DialogClose render={<Button variant="outline">閉じる</Button>} />
            <Button onClick={handleSave} disabled={!apiKey.trim()}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

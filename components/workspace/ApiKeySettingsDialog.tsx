"use client";

/**
 * Gemini APIキー設定ダイアログ。
 *
 * BYOK（Bring Your Own Key）方針（`docs/mock-implementation-plan.md` §2.5 決定）。
 * キー自体はサーバー（Clerkユーザーの private metadata）に保存し、クライアントには
 * 「設定済みかどうか」のみを返す（`app/api/ai/api-key`）。そのため入力欄は常に空で
 * 始まり、保存済みのキーが画面に表示されることはない。
 */

import { useEffect, useState } from "react";
import { Check, CircleHelp, Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";

import {
  clearApiKeyApi,
  fetchApiKeyStatus,
  saveApiKeyApi,
} from "@/lib/api/ai-client";
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchApiKeyStatus()
      .then((res) => {
        if (!cancelled) setConfigured(res.configured);
      })
      .catch((err: unknown) => {
        console.error("[ai] APIキー設定状況の取得に失敗しました", err);
        if (!cancelled) setError("設定状況の取得に失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    try {
      await saveApiKeyApi(trimmed);
      setConfigured(true);
      setApiKey("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setPending(false);
    }
  };

  const handleClear = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await clearApiKeyApi();
      setConfigured(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setSaved(false);
          setError(null);
          setApiKey("");
          setHelpOpen(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gemini APIキー設定</DialogTitle>
          <DialogDescription>
            AI機能はあなた個人のGemini APIキー（無料枠）で動作します（BYOK）。
            キーはあなたのアカウント情報として安全に保存され、他のメンバーからは
            見えません。
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="gemini-api-key">APIキー</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={helpOpen}
                onClick={() => setHelpOpen((v) => !v)}
              >
                <CircleHelp data-icon="inline-start" />
                発行方法
              </Button>
            </div>
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
              {configured === null
                ? "設定状況を確認しています…"
                : configured
                  ? "設定済みです。新しいキーを入力して保存すると上書きされます。"
                  : "未設定です。Google AI StudioなどでGeminiのAPIキーを取得して入力してください。"}
            </FieldDescription>
            {error && (
              <FieldDescription className="text-destructive">
                {error}
              </FieldDescription>
            )}
            {helpOpen && (
              <div className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Gemini APIキーの発行手順
                </p>
                <ol className="flex list-decimal flex-col gap-1 pl-5">
                  <li>Google AI Studio の API Keys ページを開きます。</li>
                  <li>
                    Googleアカウントでログインし、利用規約への同意が求められたら確認します。
                  </li>
                  <li>
                    「Create API key」を押して、利用するGoogle
                    Cloudプロジェクトを選びます。
                  </li>
                  <li>
                    表示されたキーをコピーし、この入力欄に貼り付けて保存します。
                  </li>
                </ol>
                <p>
                  キーはパスワードと同じ扱いです。GitHub、提出物、画面共有に写さないでください。
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Google AI Studio を開く
                </a>
              </div>
            )}
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
            {configured && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={pending}
              >
                <Trash2 data-icon="inline-start" />
                削除
              </Button>
            )}
            <DialogClose render={<Button variant="outline">閉じる</Button>} />
            <Button onClick={handleSave} disabled={!apiKey.trim() || pending}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

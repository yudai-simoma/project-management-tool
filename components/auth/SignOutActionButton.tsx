"use client";

import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

/**
 * 承認待ち・却下済みの案内画面（`/pending-approval`・`/rejected`）で使う
 * サインアウトボタン。`GlobalHeader.tsx` の `UserMenu` と同じ `useClerk().signOut()`
 * パターンを踏襲する。
 */
export function SignOutActionButton() {
  const clerk = useClerk();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => clerk.signOut({ redirectUrl: "/sign-in" })}
    >
      サインアウト
    </Button>
  );
}

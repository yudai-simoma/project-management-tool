/**
 * 楽観的更新のための小さなユーティリティ群。
 *
 * `Workspace.tsx` の各ハンドラは「ローカル state を即座に更新（今までと同じ体感）→
 * 裏で API を呼ぶ → 失敗したら直前の状態に黙って戻す（console.error のみ記録し、
 * 見た目・UI部品は追加しない）」という方針を取る
 * （`docs/backend-implementation-plan.md` セクション2で確認済み）。
 */

import type { Dispatch, SetStateAction } from "react";

/** 非同期処理を実行し、失敗時は `rollback` でローカル state を元に戻す（fire-and-forget）。 */
export function runOptimistic(
  action: () => Promise<unknown>,
  rollback: () => void,
): void {
  action().catch((error: unknown) => {
    console.error(
      "[optimistic-update] APIリクエストに失敗したため、ローカルの変更を元に戻します。",
      error,
    );
    rollback();
  });
}

/**
 * 配列 state から `id` 一致の要素を取り除き、取り除く前の位置と要素を返す
 * （ロールバック時に元の位置へ戻すために使う）。見つからない場合は `null`。
 */
export function removeById<T extends { id: string }>(
  setState: Dispatch<SetStateAction<T[]>>,
  id: string,
): { item: T; index: number } | null {
  let removed: { item: T; index: number } | null = null;
  setState((prev) => {
    const index = prev.findIndex((item) => item.id === id);
    if (index === -1) return prev;
    removed = { item: prev[index], index };
    return [...prev.slice(0, index), ...prev.slice(index + 1)];
  });
  return removed;
}

/** 配列 state の指定位置に要素を再挿入する（`removeById` のロールバック用）。 */
export function insertAt<T>(
  setState: Dispatch<SetStateAction<T[]>>,
  index: number,
  item: T,
): void {
  setState((prev) => [...prev.slice(0, index), item, ...prev.slice(index)]);
}

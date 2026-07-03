import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * `YYYY-MM-DD` 形式の文字列を `Date` に変換する。
 * 空文字 / 不正フォーマットは `undefined` を返す。
 *
 * 時刻は `T00:00:00` をローカルタイムで補い、タイムゾーン跨ぎを避ける。
 * `components/primitives/InlineDateField.tsx` から利用する汎用ヘルパー。
 */
export function parseISODate(s: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s + "T00:00:00");
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * `Date` を `YYYY-MM-DD` 形式の文字列に整形する。
 * `undefined` または不正な Date は空文字を返す。
 */
export function formatISODate(d: Date | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

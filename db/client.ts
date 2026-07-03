/**
 * Neon への Drizzle 接続クライアント（HTTP ドライバ）。
 *
 * `@neondatabase/serverless` の HTTP モード（`neon-http`）を採用する。Vercel の
 * Serverless Functions・Edge Runtime のどちらからでも接続でき、コネクションプールを
 * 自前で管理する必要がない（`docs/mock-implementation-plan.md` §2.6）。
 * トランザクションが必要になった場合は `drizzle-orm/neon-serverless`（WebSocket）への
 * 切替を検討する。
 *
 * `db` は実際にクエリを発行した瞬間まで接続生成（＝ `DATABASE_URL` の検証）を遅延する
 * Proxy になっている（§2 で追加）。`next build` の「ページデータ収集」フェーズは
 * Route Handler・Server Component のモジュールをトップレベルまで評価するため、
 * ここで即座に接続を作ってしまうと `DATABASE_URL` 未設定の環境（Neonプロジェクト
 * 未作成のユーザー環境や、DBを使わないセクションのCI）でビルド自体が失敗してしまう。
 * 実行時に実際に DB へアクセスするコードパスに到達したときだけ検証エラーを出す。
 *
 * `tsx` 経由で実行するスクリプト（`db/seed.ts` 等）は Next.js の env 読み込みを
 * 経由しないため、ここで明示的に `.env.local` を読み込む。Next.js ランタイム
 * （API Route Handler 等）では既に読み込み済みの環境変数を上書きしない
 * （`dotenv` は既存の env を上書きしないため安全）。
 */

import { neon } from "@neondatabase/serverless";
import { config as loadEnv } from "dotenv";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

loadEnv({ path: ".env.local", quiet: true });

type Db = NeonHttpDatabase<typeof schema>;

let cachedDb: Db | null = null;

function createDb(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL が未設定です。.env.example を参考に .env.local を作成し、" +
        "Neon の接続文字列（Connection string）を設定してください。",
    );
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

function getDb(): Db {
  if (!cachedDb) cachedDb = createDb();
  return cachedDb;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop);
    // クラスメソッドは real インスタンスに bind し直す（プライベートフィールドを
    // 使うメソッドを Proxy 経由の `this` で呼ぶと壊れるため）。
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as Db;

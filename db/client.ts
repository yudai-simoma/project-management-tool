/**
 * Neon への Drizzle 接続クライアント（HTTP ドライバ）。
 *
 * `@neondatabase/serverless` の HTTP モード（`neon-http`）を採用する。Vercel の
 * Serverless Functions・Edge Runtime のどちらからでも接続でき、コネクションプールを
 * 自前で管理する必要がない（`docs/mock-implementation-plan.md` §2.6）。
 * トランザクションが必要になった場合は `drizzle-orm/neon-serverless`（WebSocket）への
 * 切替を検討する。
 *
 * このモジュールは import された時点で `DATABASE_URL` を要求する。API Route Handler・
 * シードスクリプトなど、実際に DB へアクセスするコードからのみ import すること
 * （型定義だけが必要な場合は `@/db/schema` を直接 import する）。
 *
 * `tsx` 経由で実行するスクリプト（`db/seed.ts` 等）は Next.js の env 読み込みを
 * 経由しないため、ここで明示的に `.env.local` を読み込む。Next.js ランタイム
 * （API Route Handler 等）では既に読み込み済みの環境変数を上書きしない
 * （`dotenv` は既存の env を上書きしないため安全）。
 */

import { neon } from "@neondatabase/serverless";
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

loadEnv({ path: ".env.local", quiet: true });

function createDb() {
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

export const db = createDb();

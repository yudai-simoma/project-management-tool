import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL が未設定です。.env.example を参考に .env.local を作成し、" +
      "Neon の接続文字列（Connection string）を設定してください。",
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});

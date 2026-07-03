import { defineConfig } from "vitest/config";
import path from "path";
import { config as loadEnv } from "dotenv";

// `.env.local` に DATABASE_URL が設定されていれば、実 Neon 接続を伴う
// __tests__/db-integration.test.ts を実行できるようにする（未設定時はテスト側でスキップする）。
loadEnv({ path: path.resolve(__dirname, ".env.local"), quiet: true });

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

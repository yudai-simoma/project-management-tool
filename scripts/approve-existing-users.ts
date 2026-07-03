/**
 * 会員承認制（`docs/feedback-implementation-plan.md` ステップ1）導入時の一括承認スクリプト。
 *
 * `lib/auth/approval.ts` の `getApprovalStatus` は「`publicMetadata.approvalStatus` が
 * 未設定 = pending」として扱う。これは新規サインアップを既定で pending にするための
 * 仕様だが、そのまま既に稼働中の既存ユーザーにも適用すると、本ステップ適用と同時に
 * 全員が締め出されてしまう。ユーザーの決定（「既存ユーザーは一括で承認済みにする」）に
 * 基づき、本ステップ適用時に一度だけ実行し、`approvalStatus` が未設定の全ユーザーを
 * 明示的に `"approved"` にする（既に `approvalStatus` が設定済みのユーザーは
 * スキップするため、再実行しても安全＝冪等）。
 *
 * 実行方法: `npm run approve-existing-users`
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

// `.env.local` の読み込みより後に import する（`clerkClient()` が
// `CLERK_SECRET_KEY` を読むタイミングに間に合わせるため）。
import { clerkClient } from "@clerk/nextjs/server";

async function main() {
  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ limit: 500 });

  let approvedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    if (user.publicMetadata?.approvalStatus !== undefined) {
      skippedCount += 1;
      continue;
    }
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: { approvalStatus: "approved" },
    });
    approvedCount += 1;
  }

  console.log(
    `完了: approved=${approvedCount}（新規に承認済みへ設定） ` +
      `skipped=${skippedCount}（既に approvalStatus 設定済み）`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("一括承認処理でエラーが発生しました:", error);
    process.exit(1);
  });

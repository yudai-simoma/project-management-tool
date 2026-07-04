# プロジェクト管理ツール

プロジェクトカテゴリ → プロジェクト → タスクの階層でチームの進行状況を管理する、社内向けのプロジェクト管理 Web アプリです。
Owner / Admin / Member のロール権限、全体進捗を俯瞰するリスク優先ダッシュボード、AI（Gemini）による進捗サマリー・壁打ちアシスタントを備えています。

## デモ

- **本番環境:** https://project-management-tool-tawny.vercel.app/
- Google アカウントでサインイン後、組織を作成/参加するとワークスペースに入れます

![プロジェクト管理ワークスペースの4ペイン構造](docs/screenshot-workspace.png)

## 主な機能

- **4ペイン構成のワークスペース**: プロジェクト一覧（Pane 1）→ タスク階層（Pane 2）→ タスク一覧・詳細（Pane 3）→ 詳細編集/AIアシスタント（Pane 4）を横断してドリルダウンできる画面構成
- **タスクの階層管理**: 大項目/中項目/小項目の3階層でタスクを整理し、担当者・期限・進捗を管理
- **ロールベースの権限制御**: Owner/Admin/Member の3ロールで、プロジェクト・タスクの削除や組織管理操作を制限
- **リスク優先の全体ダッシュボード**: 遅延・期限超過などリスクの高いプロジェクトを優先的に表示するポートフォリオビュー
- **AI 進捗サマリー・壁打ちアシスタント**: Google Gemini（BYOK、ユーザーごとのAPIキー）でタスクの提案・要約を対話的に生成
- **会員承認制**: 新規参加メンバーを管理者が承認するまでアクセス制限をかけるオンボーディングフロー

## 技術スタック

- **Next.js 16** / **React 19** / **TypeScript**（strict）
- **Tailwind CSS v4**（`app/globals.css` の `@theme` で CSS 変数を一元管理）
- **shadcn/ui**（`base-nova` スタイル / `@base-ui/react` ベース）
- **lucide-react**（アイコン）/ **zod**（実行時の型検証）
- **Neon**（Postgres）+ **Drizzle**（ORM、`db/schema.ts`・`db/repositories/*`）
- **Clerk**（Google認証・Organizations・Owner/Admin/Memberロール）
- **Vercel AI SDK**（`ai` + `@ai-sdk/google`）+ **Google Gemini**（BYOK、ユーザー個人のAPIキー）

## ローカルで起動する

```bash
git clone <このリポジトリのURL>
cd project-management-tool
npm install
cp .env.example .env.local   # 環境変数を設定する（次項「環境変数」参照）
npm run db:migrate           # Neon にテーブルを作成
npm run db:seed              # サンプルデータを投入
npm run dev
```

ブラウザで `http://localhost:3000` を開くと、Clerkのサインイン画面（未サインイン時）→組織作成/参加のオンボーディング→プロジェクト管理ワークスペースの4ペイン画面が表示されます。

> Node.js のバージョンに注意: `vitest.config.ts` の読み込みに Node 20.19 以上が必要です（`vite@7` のフルESM化のため）。デフォルトのNodeが古い場合は Node 22 LTS 以上に切り替えてから `npm run dev` / `npm run test` を実行してください。

## 環境変数

`.env.example` に必要なキー名をまとめている。`.env.local`（gitignore対象）にコピーして値を埋める。

| 変数名                              | 必須                      | 取得元・説明                                                                                                                              |
| ----------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                      | ✅                        | Neon コンソール → Connect → Connection string。`drizzle-orm/neon-http`（HTTP経由）を使うため pooled connection の文字列でよい             |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅                        | Clerk Dashboard → API Keys                                                                                                                |
| `CLERK_SECRET_KEY`                  | ✅                        | Clerk Dashboard → API Keys                                                                                                                |
| `SEED_ORG_ID`                       | 開発時のみ（`db:seed`用） | `npm run db:seed` の投入先組織ID（`org_xxx`）。Clerkでアプリの組織を作成した後、Dashboard の Organizations 一覧で確認する。本番では未使用 |
| `APPROVAL_REQUIRED`                 | 任意                      | 会員承認制を有効にするか（既定値 `true`）。承認前の確認者にも画面を見せたい場合は `false` にする                                          |
| `AI_PROVIDER`                       | 任意                      | AI provider（現在の実装は `gemini` のみ）                                                                                                 |
| `AI_MODEL_ID`                       | 任意                      | 未設定ユーザーの既定GeminiモデルID（既定値 `gemini-2.5-flash`）。ユーザーごとのモデルは画面右上「Gemini API・モデル設定」から変更できる   |
| `GEMINI_MODEL_ID`                   | 任意                      | 後方互換用。未設定なら `AI_MODEL_ID` → `GEMINI_MODEL_ID` → 既定値の順で解決する                                                           |

Clerk側の事前設定（Dashboard の初期設定として一度だけ必要）:

- Organizations を有効化し、「Membership required」（個人アカウント無効・組織所属必須）を選択する
- 認証方式は Google のみを有効化する
- Owner/Admin/Memberの3段階ロールを使うため、`org:owner` というカスタムロール（Adminと同じ全権限）を作成し、「Role sets」→「Primary Role Set」の Creator's initial role を `org:owner` に変更する（組織作成者はOwner、招待されたメンバーの既定ロールはMemberになる）

## 構成

### ディレクトリ構成

```
app/                Next.js App Router の画面エントリ・API Route Handler
  page.tsx          トップページ（DBから初期データ取得 → Workspace を呼んでいる）
  api/               Category/Project/Task/Member/AI の CRUD API
  sign-in/ sign-up/ onboarding/  Clerk 認証・組織オンボーディング画面
  globals.css       色・角丸・余白などのデザイントークン
components/
  ui/               shadcn の UI 部品（Button, Card, Dialog 等）
  primitives/       このプロジェクト独自の編集 UI 部品
  workspace/        4ペイン本体（Pane1〜4 と関連ダイアログ）
db/                 Drizzle スキーマ・接続クライアント・リポジトリ層・シード
data/               サンプルの種データ（JSON、`db:seed` 用。実運用パスはDB/Clerk）
hooks/              React のカスタムフック
lib/                型定義（zod スキーマ）・ユーティリティ・認証/権限判定・AI連携
__tests__/          テスト
```

### 開発コマンド

| コマンド               | 役割                                     |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | 開発サーバー起動                         |
| `npm run build`        | 本番ビルド                               |
| `npm run lint`         | ESLint チェック                          |
| `npm run test`         | スモークテスト（Vitest）                 |
| `npm run format`       | Prettier で整形                          |
| `npm run check:radius` | 角丸ドリフト検出（独自スクリプト）       |
| `npm run db:generate`  | Drizzle マイグレーションファイルの生成   |
| `npm run db:migrate`   | Neon にマイグレーションを適用            |
| `npm run db:seed`      | `data/*.json` のサンプルデータを投入     |

## デプロイ（Vercel）

1. Neon でプロジェクトを作成し、`DATABASE_URL` を発行する
2. Clerk でアプリケーションを作成し、本番用インスタンスのキーを発行する（開発用インスタンスのキーとは別。「環境変数」節の事前設定を本番インスタンス側でも行う）
3. Vercel のプロジェクト設定 → Environment Variables に、上記「環境変数」表の `DATABASE_URL`・`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`・`CLERK_SECRET_KEY` を設定する（`SEED_ORG_ID` は本番では不要）
4. デプロイ前に一度ローカルから `npm run db:migrate` を実行し、本番DBにテーブルを作成しておく（Vercelのビルド時にはマイグレーションを自動実行しないため）
5. `git push` などでVercelにデプロイする（`next build` が通ることは `npm run build` で事前確認済み）
6. デプロイ後、Clerk Dashboard の「Paths」設定で本番URLを許可オリジンに追加する

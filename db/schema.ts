/**
 * Drizzle テーブル定義（Neon / Postgres 向け）。
 *
 * `lib/schema.ts` の zod スキーマ（Category/Member/Project/Task）に対応するテーブルを
 * 定義する。カラム名・型は zod スキーマのフィールドにできるだけ一対一で対応させ、
 * 進捗率・期限リスクなどの派生値はカラムとして持たない
 * （`lib/computed/projects.ts` と同様、読み出し側で都度計算する）。
 *
 * 2点、zod スキーマにない列を追加している（いずれもビジネス上の派生値ではなく、
 * DB化に伴い必要になった技術的な列）:
 *
 * - `sortOrder`（projects/tasks）: モックの JSON 配列順がそのまま Pane2 カンバン内の
 *   並び順・Pane4 タスク一覧の並び順として使われている（`Workspace.tsx` の
 *   `moveProject` 等）。Postgres の行に順序保証は無いため、配列順を復元するための
 *   列として追加した。CRUD API 化（セクション2）で並び替え時の更新方針を詰める。
 * - `createdAt`: 監査・デバッグ用の一般的な列。zod スキーマにも UI にも影響しない。
 *
 * `Task.assigneeId` は `Member.id` への参照だが、未アサイン時は空文字を持つ
 * （zod スキーマも `z.string()` で null 不可）。空文字は実在しない外部キー値になるため、
 * DB レベルの外部キー制約は付けていない（`categoryId`/`projectId` のような必須の参照とは
 * 異なり、任意参照のため）。参照整合性はアプリ層（zod・API層）で担保する方針を踏襲する。
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["owner", "admin", "member"]);

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "inProgress",
  "review",
  "done",
]);

// ===== Pane 1: プロジェクトカテゴリ =====

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ===== 組織メンバー =====

export const members = pgTable("members", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ===== プロジェクト =====

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  status: projectStatusEnum("status").notNull(),
  /** `YYYY-MM-DD`。未設定は空文字（zod の `deadline: z.string()` に合わせる）。 */
  deadline: text("deadline").notNull().default(""),
  /** カンバン内・全体配列内での表示順。小さいほど先頭。 */
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ===== タスク =====

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  /** `YYYY-MM-DD`。未設定は空文字。 */
  dueDate: text("due_date").notNull().default(""),
  /** `Member.id` への参照。未アサインは空文字（外部キー制約なし、上記コメント参照）。 */
  assigneeId: text("assignee_id").notNull().default(""),
  memo: text("memo").notNull().default(""),
  /** プロジェクト内での表示順。小さいほど先頭。 */
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ===== リレーション（drizzle query API 用。DB制約とは独立） =====

export const categoriesRelations = relations(categories, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  category: one(categories, {
    fields: [projects.categoryId],
    references: [categories.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
export type MemberRow = typeof members.$inferSelect;
export type NewMemberRow = typeof members.$inferInsert;
export type ProjectRowDb = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
export type TaskRowDb = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;

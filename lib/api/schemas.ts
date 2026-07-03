/**
 * Route Handler（`app/api/**`）のリクエストボディ検証用 zod スキーマ。
 *
 * `lib/schema.ts` のドメインスキーマをそのまま流用できる箇所（`roleSchema` 等）は
 * 再利用し、CRUD API 特有の形（作成時のみ `id` を必須にする、更新時は各項目を
 * optional にする等）はここで定義する。
 */

import { z } from "zod";

import { projectStatusKeySchema, roleSchema } from "@/lib/schema";

// ===== カテゴリ =====

export const createCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1),
});

// ===== メンバー =====

export const createMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: roleSchema,
});

export const updateMemberSchema = z
  .object({
    name: z.string().min(1).optional(),
    role: roleSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新項目が指定されていません",
  });

// ===== プロジェクト =====

export const createProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().min(1),
  status: projectStatusKeySchema.optional().default("planning"),
  deadline: z.string().optional().default(""),
});

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    status: projectStatusKeySchema.optional(),
    deadline: z.string().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新項目が指定されていません",
  });

export const reorderProjectsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        status: projectStatusKeySchema,
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1),
});

// ===== タスク =====

export const createTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  done: z.boolean().optional().default(false),
  dueDate: z.string().optional().default(""),
  assigneeId: z.string().optional().default(""),
  memo: z.string().optional().default(""),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    done: z.boolean().optional(),
    dueDate: z.string().optional(),
    assigneeId: z.string().optional(),
    memo: z.string().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新項目が指定されていません",
  });

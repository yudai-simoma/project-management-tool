/**
 * Route Handler（`app/api/**`）のリクエストボディ検証用 zod スキーマ。
 *
 * `lib/schema.ts` のドメインスキーマをそのまま流用できる箇所（`roleSchema` 等）は
 * 再利用し、CRUD API 特有の形（作成時のみ `id` を必須にする、更新時は各項目を
 * optional にする等）はここで定義する。
 */

import { z } from "zod";

import { GEMINI_MODEL_IDS } from "@/lib/ai/model-config";
import {
  memberSchema,
  projectSchema,
  projectStatusKeySchema,
  roleSchema,
  taskLevelSchema,
} from "@/lib/schema";

// ===== カテゴリ =====

export const createCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1),
});

// ===== メンバー（Clerk Organizations 経由） =====

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
});

export const updateMemberRoleSchema = z.object({
  role: roleSchema,
});

// ===== プロジェクト =====

export const createProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: projectStatusKeySchema.optional().default("planning"),
  deadline: z.string().optional().default(""),
});

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).optional(),
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
        status: projectStatusKeySchema.optional(),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1),
});

// ===== タスク =====

export const createTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  parentTaskId: z.string().min(1).nullable().optional().default(null),
  level: taskLevelSchema.optional().default("small"),
  done: z.boolean().optional().default(false),
  dueDate: z.string().optional().default(""),
  assigneeId: z.string().optional().default(""),
  memo: z.string().optional().default(""),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    parentTaskId: z.string().min(1).nullable().optional(),
    level: taskLevelSchema.optional(),
    done: z.boolean().optional(),
    dueDate: z.string().optional(),
    assigneeId: z.string().optional(),
    memo: z.string().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新項目が指定されていません",
  });

// ===== AI（Gemini実接続、BYOK） =====

export const aiApiKeySchema = z.object({
  apiKey: z.string().min(1).optional(),
  modelId: z.enum(GEMINI_MODEL_IDS),
});

export const geminiApiKeySchema = aiApiKeySchema;

export const aiSummaryRequestSchema = z.object({
  project: projectSchema,
  categoryName: z.string(),
});

export const aiChatRequestSchema = z.object({
  project: projectSchema,
  categoryName: z.string(),
  members: z.array(memberSchema),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  message: z.string().min(1),
});

// ===== 会員承認制（プラットフォーム管理者専用ページ） =====

export const updateApprovalStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

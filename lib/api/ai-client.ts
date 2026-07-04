/**
 * AI関連（`app/api/ai/**`）の Route Handler 呼び出しラッパー。
 * fetch本体は `lib/api/http.ts` の `apiFetch` を共用する。
 */

import { apiFetch } from "@/lib/api/http";
import type { AiModelConfig, GeminiModelId } from "@/lib/ai/model-config";
import type { AiAction } from "@/lib/ai/tools";
import type { Member, Project } from "@/lib/schema";

// ===== APIキー設定（BYOK） =====

export type AiApiKeyStatus = {
  configured: boolean;
  modelId: GeminiModelId;
};

export function fetchApiKeyStatus(): Promise<AiApiKeyStatus> {
  return apiFetch("/api/ai/api-key");
}

export function saveApiKeyApi(input: {
  apiKey?: string;
  modelId: GeminiModelId;
}): Promise<AiApiKeyStatus> {
  return apiFetch("/api/ai/api-key", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function clearApiKeyApi(): Promise<AiApiKeyStatus> {
  return apiFetch("/api/ai/api-key", { method: "DELETE" });
}

// ===== AI進捗サマリー（Pane 3） =====

export type AiSummaryResponse = {
  source: "gemini" | "fallback";
  summary: string;
};

export function fetchAiSummary(input: {
  project: Project;
  categoryName: string;
}): Promise<AiSummaryResponse> {
  return apiFetch("/api/ai/summary", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ===== AIアシスタント（Pane 4） =====

export type AiChatReply =
  | { kind: "text"; content: string }
  | { kind: "taskProposal"; intro: string; titles: string[] };

export type AiChatUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AiChatResponse = {
  source: "gemini" | "fallback";
  reply: AiChatReply;
  actions: AiAction[];
  usage: AiChatUsage | null;
  model: AiModelConfig;
};

export function sendAiChatMessage(input: {
  project: Project;
  categoryName: string;
  members: Member[];
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}): Promise<AiChatResponse> {
  return apiFetch("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

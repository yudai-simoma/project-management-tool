import { auth } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { NextResponse } from "next/server";

import { getAiSettings } from "@/lib/ai/api-key";
import { createAiModel, getAiModelConfig } from "@/lib/ai/model";
import { buildSummaryPrompt, buildSummarySystemPrompt } from "@/lib/ai/prompts";
import { requireOrgId } from "@/lib/api/auth";
import { readJsonBody, zodErrorResponse } from "@/lib/api/respond";
import { aiSummaryRequestSchema } from "@/lib/api/schemas";
import { AI_NO_API_KEY_MESSAGE, AI_SUMMARY_ERROR_MESSAGE } from "@/lib/labels";

export async function POST(request: Request) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  const parsed = aiSummaryRequestSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const { userId } = await auth();
  const settings = await getAiSettings(userId!);
  if (!settings.apiKey) {
    return NextResponse.json({
      source: "fallback",
      summary: AI_NO_API_KEY_MESSAGE,
    });
  }

  const { project, categoryName } = parsed.data;

  try {
    const result = await generateText({
      model: createAiModel(settings.apiKey, getAiModelConfig(settings.modelId)),
      system: buildSummarySystemPrompt(),
      prompt: buildSummaryPrompt(project, categoryName),
    });
    return NextResponse.json({ source: "gemini", summary: result.text.trim() });
  } catch (error) {
    console.error("[api/ai/summary]", error);
    return NextResponse.json(
      { error: AI_SUMMARY_ERROR_MESSAGE },
      { status: 502 },
    );
  }
}

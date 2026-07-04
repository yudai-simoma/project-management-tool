import { auth } from "@clerk/nextjs/server";
import { generateText, stepCountIs } from "ai";
import { NextResponse } from "next/server";

import { getAiSettings } from "@/lib/ai/api-key";
import { createAiModel, getAiModelConfig } from "@/lib/ai/model";
import { buildChatSystemPrompt } from "@/lib/ai/prompts";
import { buildAiTools, type AiAction } from "@/lib/ai/tools";
import { requireOrgId } from "@/lib/api/auth";
import { readJsonBody, zodErrorResponse } from "@/lib/api/respond";
import { aiChatRequestSchema } from "@/lib/api/schemas";
import { AI_CHAT_ERROR_MESSAGE, AI_NO_API_KEY_MESSAGE } from "@/lib/labels";

/** ツール呼び出しの上限ステップ数。誤ループを防ぐための上限（内部ツールでの通常利用では数回で十分）。 */
const MAX_STEPS = 4;

export async function POST(request: Request) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  const parsed = aiChatRequestSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const { userId } = await auth();
  const settings = await getAiSettings(userId!);
  const model = getAiModelConfig(settings.modelId);
  if (!settings.apiKey) {
    return NextResponse.json({
      source: "fallback",
      reply: { kind: "text", content: AI_NO_API_KEY_MESSAGE },
      actions: [],
      usage: null,
      model,
    });
  }

  const { project, categoryName, members, history, message } = parsed.data;

  try {
    const result = await generateText({
      model: createAiModel(settings.apiKey, model),
      system: buildChatSystemPrompt({ project, categoryName, members }),
      messages: [
        ...history.map((h) => ({ role: h.role, content: h.content }) as const),
        { role: "user" as const, content: message },
      ],
      tools: buildAiTools({ tasks: project.tasks, members }),
      stopWhen: stepCountIs(MAX_STEPS),
    });

    const actions: AiAction[] = [];
    for (const toolResult of result.toolResults) {
      const output = toolResult.output as AiAction | { type: "error" };
      if (output.type !== "error") actions.push(output);
    }

    const proposal = actions.find((a) => a.type === "proposeTasks");
    const reply = proposal
      ? {
          kind: "taskProposal" as const,
          intro: proposal.intro,
          titles: proposal.titles,
        }
      : {
          kind: "text" as const,
          content: result.text.trim() || "(応答がありませんでした)",
        };

    return NextResponse.json({
      source: "gemini",
      reply,
      actions: actions.filter((a) => a.type !== "proposeTasks"),
      usage: result.usage ?? null,
      model,
    });
  } catch (error) {
    console.error("[api/ai/chat]", error);
    return NextResponse.json({ error: AI_CHAT_ERROR_MESSAGE }, { status: 502 });
  }
}

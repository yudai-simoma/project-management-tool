import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getAiSettings, setAiApiKey, setAiSettings } from "@/lib/ai/api-key";
import { requireOrgId } from "@/lib/api/auth";
import { readJsonBody, zodErrorResponse } from "@/lib/api/respond";
import { aiApiKeySchema } from "@/lib/api/schemas";

/** APIキー自体は返さず、設定済みかどうかと使用モデルのみを返す。 */
export async function GET() {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const { userId } = await auth();
  const settings = await getAiSettings(userId!);
  return NextResponse.json({
    configured: settings.apiKey !== null,
    modelId: settings.modelId,
  });
}

export async function PUT(request: Request) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  const parsed = aiApiKeySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const { userId } = await auth();
  await setAiSettings(userId!, parsed.data);
  const settings = await getAiSettings(userId!);
  return NextResponse.json({
    configured: settings.apiKey !== null,
    modelId: settings.modelId,
  });
}

export async function DELETE() {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const { userId } = await auth();
  await setAiApiKey(userId!, "");
  const settings = await getAiSettings(userId!);
  return NextResponse.json({ configured: false, modelId: settings.modelId });
}

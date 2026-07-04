import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getAiApiKey, setAiApiKey } from "@/lib/ai/api-key";
import { requireOrgId } from "@/lib/api/auth";
import { readJsonBody, zodErrorResponse } from "@/lib/api/respond";
import { aiApiKeySchema } from "@/lib/api/schemas";

/** APIキー自体は返さない。設定済みかどうかのみを返す（`ApiKeySettingsDialog` の表示用）。 */
export async function GET() {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const { userId } = await auth();
  const apiKey = await getAiApiKey(userId!);
  return NextResponse.json({ configured: apiKey !== null });
}

export async function PUT(request: Request) {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  const parsed = aiApiKeySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const { userId } = await auth();
  await setAiApiKey(userId!, parsed.data.apiKey);
  return NextResponse.json({ configured: true });
}

export async function DELETE() {
  const ctx = await requireOrgId();
  if (!ctx.ok) return ctx.response;

  const { userId } = await auth();
  await setAiApiKey(userId!, "");
  return NextResponse.json({ configured: false });
}

import { isDicePreviewEnabled } from "@/features/game-tools/diceAvailability";
import { createDicePreviewResponse } from "@/features/game-tools/dice-preview/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; asset?: string[] }> },
) {
  const { locale, asset } = await params;
  return createDicePreviewResponse(locale, asset, isDicePreviewEnabled());
}

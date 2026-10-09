import { NextResponse } from "next/server";
import { expirePastResidencySlots } from "@/features/merchants/residency/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const summary = await expirePastResidencySlots();
    if (summary.remaining > 0) {
      console.warn(
        "Expired store bookings remain after scheduled batch",
        summary,
      );
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("Failed to close expired store bookings", error);
    return NextResponse.json(
      { error: "STORE_BOOKING_EXPIRY_FAILED" },
      { status: 500 },
    );
  }
}

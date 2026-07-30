import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      incomingRequests: [],
      updatedAt: new Date().toISOString(),
    },
    { status: 410 },
  );
}

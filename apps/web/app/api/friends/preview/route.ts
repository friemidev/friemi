import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      user: null,
      status: "FOLLOW_SYSTEM_ACTIVE",
    },
    { status: 410 },
  );
}

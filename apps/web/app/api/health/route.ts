import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "next-fun-club",
    timestamp: new Date().toISOString()
  });
}

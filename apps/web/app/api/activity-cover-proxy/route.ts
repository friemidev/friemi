import { NextResponse } from "next/server";
import { isHotlinkProtectedCoverUrl } from "@/lib/activity-cover-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const imageUrl = new URL(request.url).searchParams.get("url")?.trim();

  if (!imageUrl) {
    return NextResponse.json({ error: "MISSING_URL" }, { status: 400 });
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
  }

  if (parsedUrl.protocol !== "https:" || !isHotlinkProtectedCoverUrl(imageUrl)) {
    return NextResponse.json({ error: "UNSUPPORTED_URL" }, { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "FETCH_FAILED" }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 502 });
  }
}

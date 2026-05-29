import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getSupportedActivityLinkHosts,
  parseActivityLink,
} from "@/features/activity-link-import/parseActivityLink";
import { hasClerkKeys } from "@/lib/clerk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function isAuthorized() {
  if (!hasClerkKeys()) {
    return true;
  }

  const { userId } = await auth();

  return Boolean(userId);
}

function getErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";

  if (message === "INVALID_URL") {
    return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
  }

  if (message === "UNSUPPORTED_URL" || message === "UNSUPPORTED_HOST") {
    return NextResponse.json(
      {
        error: "UNSUPPORTED_HOST",
        supportedHosts: getSupportedActivityLinkHosts(),
      },
      { status: 400 },
    );
  }

  if (message === "UNSUPPORTED_CONTENT") {
    return NextResponse.json({ error: "UNSUPPORTED_CONTENT" }, { status: 415 });
  }

  return NextResponse.json({ error: "FETCH_FAILED" }, { status: 502 });
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { locale?: unknown; url?: unknown };
    const locale = typeof body.locale === "string" ? body.locale : "zh-CN";
    const url = typeof body.url === "string" ? body.url : "";
    const preview = await parseActivityLink(url, locale);

    return NextResponse.json({ preview });
  } catch (error) {
    console.error("Failed to preview activity link", error);

    return getErrorResponse(error);
  }
}

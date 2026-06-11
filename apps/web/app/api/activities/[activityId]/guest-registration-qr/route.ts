import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { getPublicRegistrationActivity } from "@/features/wechat-bridge/queries/getPublicRegistrationActivity";

type GuestRegistrationQrRouteProps = {
  params: Promise<{
    activityId: string;
  }>;
};

function getPublicRegistrationUrl(request: Request, activityId: string) {
  const requestUrl = new URL(request.url);
  const locale = requestUrl.searchParams.get("locale") || "zh-CN";
  const inviterToken = requestUrl.searchParams.get("inv");
  const path = `/${locale}/e/${activityId}`;
  const url = new URL(path, requestUrl.origin);

  if (inviterToken) {
    url.searchParams.set("inv", inviterToken);
  }

  return url.toString();
}

export async function GET(
  request: Request,
  { params }: GuestRegistrationQrRouteProps,
) {
  const { activityId } = await params;
  const activity = await getPublicRegistrationActivity(activityId);

  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const svg = await QRCode.toString(
    getPublicRegistrationUrl(request, activityId),
    {
      color: {
        dark: "#23372e",
        light: "#fff8ec",
      },
      margin: 1,
      type: "svg",
      width: 360,
    },
  );

  return new Response(svg, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Content-Disposition": `inline; filename="next-fun-${activityId}-qr.svg"`,
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}

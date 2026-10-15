import {
  APP_WEB_ORIGIN,
  getAppHandoffPath,
  getAppLinkTargetLocale,
  normalizeAppLinkTarget,
} from "@/features/mobile/appLinks";

export function GET(request: Request) {
  const url = new URL(request.url);
  const target = normalizeAppLinkTarget(
    url.searchParams.get("target"),
    "zh-CN",
  );
  const path = getAppHandoffPath(getAppLinkTargetLocale(target), target);
  // App Links resolve before HTTP. Browsers without the app get an explicit store choice.
  return Response.redirect(`${APP_WEB_ORIGIN}${path}&retry=1`, 302);
}

import {
  APP_WEB_ORIGIN,
  getAppHandoffPath,
  getAppLinkTargetLocale,
  normalizeAppLinkTarget,
} from "@/features/mobile/appLinks";
import { APP_HANDOFF_ENABLED } from "@/features/mobile/appHandoffRollout";

export function GET(request: Request) {
  const url = new URL(request.url);
  const target = normalizeAppLinkTarget(
    url.searchParams.get("target"),
    url.pathname.split("/")[1],
  );
  const path = APP_HANDOFF_ENABLED
    ? `${getAppHandoffPath(getAppLinkTargetLocale(target), target)}&retry=1`
    : target;
  // Do not cache a launch choice across the staged native release.
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${APP_WEB_ORIGIN}${path}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

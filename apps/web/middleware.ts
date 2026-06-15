import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { defaultLocale, locales } from "@chill-club/shared";
import { hasClerkKeys } from "./lib/clerk";
import {
  getMobileRootLobbyRedirectPath,
  localeCookieName,
} from "./lib/mobile-root-lobby-entry";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

const isProtectedRoute = createRouteMatcher([
  "/:locale/activities/new(.*)",
  "/:locale/friends(.*)",
  "/:locale/profile(.*)",
]);
const isAdminPageRoute = createRouteMatcher(["/:locale/admin(.*)"]);
const isAdminApiRoute = createRouteMatcher(["/api/admin(.*)"]);
const isUploadApiRoute = createRouteMatcher(["/api/uploads(.*)"]);
const isActivityLinkPreviewRoute = createRouteMatcher([
  "/api/activity-link-preview",
]);
const isFriendsApiRoute = createRouteMatcher(["/api/friends(.*)"]);
const isNotificationsApiRoute = createRouteMatcher(["/api/notifications(.*)"]);
const isLobbyApiRoute = createRouteMatcher(["/api/lobby(.*)"]);
const isAnalyticsApiRoute = createRouteMatcher(["/api/analytics(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const mobileRootLobbyPath = getMobileRootLobbyRedirectPath({
    acceptLanguage: request.headers.get("accept-language"),
    localeCookie: request.cookies.get(localeCookieName)?.value,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    userAgent: request.headers.get("user-agent"),
  });

  if (mobileRootLobbyPath) {
    return NextResponse.redirect(new URL(mobileRootLobbyPath, request.url));
  }

  if (hasClerkKeys() && isProtectedRoute(request)) {
    await auth.protect();
  }

  if (
    hasClerkKeys() &&
    (isAdminPageRoute(request) || isAdminApiRoute(request))
  ) {
    let authState = await auth();

    if (!authState.userId) {
      if (isAdminApiRoute(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      await auth.protect();
      authState = await auth();

      if (!authState.userId) {
        return NextResponse.redirect(
          new URL(`/${defaultLocale}/sign-in`, request.url),
        );
      }
    }

    if (isAdminApiRoute(request)) {
      return NextResponse.next();
    }
  }

  if (isUploadApiRoute(request) || isActivityLinkPreviewRoute(request)) {
    if (hasClerkKeys()) {
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }
    }

    return NextResponse.next();
  }

  if (isFriendsApiRoute(request)) {
    return NextResponse.next();
  }

  if (isNotificationsApiRoute(request)) {
    return NextResponse.next();
  }

  if (isLobbyApiRoute(request)) {
    return NextResponse.next();
  }

  if (isAnalyticsApiRoute(request)) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/:locale/updates",
    "/:locale/updates/:path*",
    "/api/admin/:path*",
    "/api/uploads/:path*",
    "/api/activity-link-preview",
    "/api/friends/:path*",
    "/api/notifications/:path*",
    "/api/lobby/:path*",
    "/api/analytics/:path*",
  ],
};

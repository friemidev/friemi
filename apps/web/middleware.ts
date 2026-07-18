import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@chill-club/shared";
import {
  getRequestRedirectTarget,
  getSignInHref,
} from "./lib/auth-redirect";
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
const canonicalProductionHost = "www.friemi.com";
const productionHostRedirects = new Set(["friemi.com", "friemi.vercel.app"]);

const isProtectedRoute = createRouteMatcher([
  "/:locale/activities/new(.*)",
  "/:locale/activities/:activityId/edit(.*)",
  "/:locale/activities/:activityId/teams/new(.*)",
  "/:locale/friends(.*)",
  "/:locale/messages(.*)",
  "/:locale/notifications(.*)",
  "/:locale/profile",
  "/:locale/profile/hangouts(.*)",
  "/:locale/profile/network(.*)",
  "/:locale/public-events/:publicEventId/teams/new(.*)",
]);
const isAdminPageRoute = createRouteMatcher(["/:locale/admin(.*)"]);
const isAdminApiRoute = createRouteMatcher(["/api/admin(.*)"]);
const isUploadApiRoute = createRouteMatcher(["/api/uploads(.*)"]);
const isUserPreviewApiRoute = createRouteMatcher(["/api/user-preview(.*)"]);
const isFriendsApiRoute = createRouteMatcher(["/api/friends(.*)"]);
const isNotificationsApiRoute = createRouteMatcher(["/api/notifications(.*)"]);
const isLobbyApiRoute = createRouteMatcher(["/api/lobby(.*)"]);
const isAnalyticsApiRoute = createRouteMatcher(["/api/analytics(.*)"]);
const isSearchApiRoute = createRouteMatcher(["/api/search(.*)"]);
const isTranslationsApiRoute = createRouteMatcher(["/api/translations(.*)"]);
const isMobileApiRoute = createRouteMatcher(["/api/mobile(.*)"]);

function getLocaleFromPath(pathname: string) {
  const locale = pathname.split("/").filter(Boolean)[0];

  return locales.some((supportedLocale) => supportedLocale === locale)
    ? locale
    : defaultLocale;
}

function getLocaleRootHomeRedirectPath(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);

  if (segments.length !== 1) {
    return null;
  }

  const [locale] = segments;

  if (!locales.some((supportedLocale) => supportedLocale === locale)) {
    return null;
  }

  return `/${locale}/home${request.nextUrl.search}`;
}

function redirectToSignIn(request: NextRequest) {
  const locale = getLocaleFromPath(request.nextUrl.pathname);
  const redirectTarget = getRequestRedirectTarget({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
  });

  return NextResponse.redirect(
    new URL(getSignInHref(locale, redirectTarget), request.url),
  );
}

function getCanonicalHostRedirectUrl(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production") {
    return null;
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return null;
  }

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const normalizedHost = host
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");

  if (!productionHostRedirects.has(normalizedHost)) {
    return null;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = "https:";
  redirectUrl.host = canonicalProductionHost;

  return redirectUrl;
}

export default clerkMiddleware(async (auth, request) => {
  const canonicalHostRedirectUrl = getCanonicalHostRedirectUrl(request);

  if (canonicalHostRedirectUrl) {
    return NextResponse.redirect(canonicalHostRedirectUrl);
  }

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

  const localeRootHomePath = getLocaleRootHomeRedirectPath(request);

  if (localeRootHomePath) {
    return NextResponse.redirect(new URL(localeRootHomePath, request.url));
  }

  if (hasClerkKeys() && isProtectedRoute(request)) {
    const { userId } = await auth();

    if (!userId) {
      return redirectToSignIn(request);
    }
  }

  if (
    hasClerkKeys() &&
    (isAdminPageRoute(request) || isAdminApiRoute(request))
  ) {
    const authState = await auth();

    if (!authState.userId) {
      if (isAdminApiRoute(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return redirectToSignIn(request);
    }

    if (isAdminApiRoute(request)) {
      return NextResponse.next();
    }
  }

  if (isUploadApiRoute(request)) {
    if (hasClerkKeys()) {
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }
    }

    return NextResponse.next();
  }

  if (isUserPreviewApiRoute(request)) {
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

  if (isSearchApiRoute(request)) {
    return NextResponse.next();
  }

  if (isTranslationsApiRoute(request)) {
    return NextResponse.next();
  }

  if (isMobileApiRoute(request)) {
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
    "/api/user-preview/:path*",
    "/api/friends/:path*",
    "/api/notifications/:path*",
    "/api/lobby/:path*",
    "/api/analytics/:path*",
    "/api/search/:path*",
    "/api/translations/:path*",
    "/api/mobile/:path*",
  ],
};

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { defaultLocale, locales } from "@chill-club/shared";
import { hasClerkKeys } from "./lib/clerk";

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

export default clerkMiddleware(async (auth, request) => {
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

  if (isUploadApiRoute(request)) {
    if (hasClerkKeys()) {
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.next();
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/api/admin/:path*",
    "/api/uploads/:path*",
  ],
};

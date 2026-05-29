import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { defaultLocale, locales } from "@chill-club/shared";
import { hasClerkKeys } from "./lib/clerk";
import { extractAdminContextFromSessionClaims, isAdminByFields } from "./lib/admin-access";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always"
});

const isProtectedRoute = createRouteMatcher(["/:locale/activities/new(.*)", "/:locale/profile(.*)"]);
const isAdminPageRoute = createRouteMatcher(["/:locale/admin(.*)"]);
const isAdminApiRoute = createRouteMatcher(["/api/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (hasClerkKeys() && isProtectedRoute(request)) {
    await auth.protect();
  }

  if (hasClerkKeys() && (isAdminPageRoute(request) || isAdminApiRoute(request))) {
    let authState = await auth();

    if (!authState.userId) {
      if (isAdminApiRoute(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      await auth.protect();
      authState = await auth();

      if (!authState.userId) {
        return NextResponse.redirect(new URL(`/${defaultLocale}/sign-in`, request.url));
      }
    }

    const context = extractAdminContextFromSessionClaims(authState.sessionClaims);
    const isAdmin = isAdminByFields({
      userId: authState.userId,
      email: context.email,
      publicRole: context.publicRole,
      privateRole: context.privateRole,
    });

    if (!isAdmin) {
      if (isAdminApiRoute(request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const localeFromPath = request.nextUrl.pathname.split("/").filter(Boolean)[0] ?? defaultLocale;
      return NextResponse.redirect(new URL(`/${localeFromPath}`, request.url));
    }

    if (isAdminApiRoute(request)) {
      return NextResponse.next();
    }
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/api/admin/:path*"]
};

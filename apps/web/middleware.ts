import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "@chill-club/shared";
import { hasClerkKeys } from "./lib/clerk";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always"
});

const isProtectedRoute = createRouteMatcher(["/:locale/activities/new(.*)", "/:locale/profile(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (hasClerkKeys() && isProtectedRoute(request)) {
    await auth.protect();
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]
};

import type { MetadataRoute } from "next";
import { buildCanonicalSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/*/admin/",
        "/*/activities/new",
        "/*/friends/",
        "/*/messages/",
        "/*/notifications/",
        "/*/profile$",
        "/*/profile/achievements",
        "/*/profile/bag",
        "/*/profile/hangouts",
        "/*/profile/invite",
        "/*/profile/network",
        "/*/profile/shop",
        "/*/profile/visitors",
        "/*/search",
        "/*/sign-in",
        "/*/sign-in/",
        "/*/sign-up",
        "/*/sign-up/",
      ],
      userAgent: "*",
    },
    sitemap: buildCanonicalSiteUrl("/sitemap.xml"),
  };
}

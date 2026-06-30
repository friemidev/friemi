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
        "/*/profile/",
        "/*/search",
        "/*/sign-in/",
        "/*/sign-up/",
      ],
      userAgent: "*",
    },
    sitemap: buildCanonicalSiteUrl("/sitemap.xml"),
  };
}

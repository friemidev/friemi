import type { MetadataRoute } from "next";
import { buildCanonicalSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: ["/api/", "/admin/", "/*/admin/"],
      userAgent: "*",
    },
    sitemap: buildCanonicalSiteUrl("/sitemap.xml"),
  };
}

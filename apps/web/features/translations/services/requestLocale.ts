import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { isContentLocale } from "./translationPolicy";

export async function getContentRequestLocale() {
  const requestHeaders = await headers();
  const explicit = requestHeaders.get("x-friemi-locale");
  if (explicit && isContentLocale(explicit)) return explicit;
  const routed = requestHeaders.get("x-next-intl-locale");
  if (routed && isContentLocale(routed)) return routed;
  const referer = requestHeaders.get("referer");
  if (referer) {
    try {
      const locale = new URL(referer).pathname.split("/")[1];
      if (isContentLocale(locale)) return locale;
    } catch {
      /* Use next-intl's request locale below. */
    }
  }
  return getLocale();
}

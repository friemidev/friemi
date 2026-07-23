const productionSiteUrl = "https://www.friemi.com";

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeSiteUrl(value: string | null | undefined) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(rawValue)
    ? rawValue
    : `https://${rawValue}`;

  try {
    const url = new URL(withProtocol);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return stripTrailingSlash(url.toString());
  } catch {
    return null;
  }
}

export function getCanonicalSiteUrl() {
  return (
    normalizeSiteUrl(process.env.CANONICAL_SITE_URL) ??
    normalizeSiteUrl(process.env.SITE_URL) ??
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    productionSiteUrl
  );
}

export function buildCanonicalSiteUrl(path = "/") {
  return new URL(path, `${getCanonicalSiteUrl()}/`).toString();
}

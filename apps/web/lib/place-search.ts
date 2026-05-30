export type ImportedAddressParts = {
  city: string | null;
  postalCode: string | null;
  raw: string;
  streetLine: string | null;
  venue: string | null;
};

const COUNTRY_TOKENS = /^(fr|france|frança|french)$/i;

const STREET_HINT =
  /\b(rue|avenue|boulevard|bd\.?|place|quai|route|allée|allee|impasse|passage|square|cours|street|str\.|boulevard)\b/i;

function isCountrySegment(segment: string) {
  return COUNTRY_TOKENS.test(segment.trim());
}

function isStreetSegment(segment: string) {
  return (
    /\b\d{5}\b/.test(segment) ||
    /^\d+[\s,]/.test(segment) ||
    STREET_HINT.test(segment)
  );
}

function isLikelyCitySegment(segment: string) {
  const normalized = segment.trim();

  if (!normalized || isCountrySegment(normalized)) {
    return false;
  }

  if (/\d{5}/.test(normalized) || isStreetSegment(normalized)) {
    return false;
  }

  return /^[A-Za-zÀ-ÿ'’\s-]{2,48}$/.test(normalized);
}

export function parseImportedAddressParts(raw: string): ImportedAddressParts {
  const normalized = raw.replace(/\s+/g, " ").trim();
  const segments = normalized
    .split(/\s*·\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  while (segments.length && isCountrySegment(segments[segments.length - 1])) {
    segments.pop();
  }

  const postalFromRaw = normalized.match(/\b(\d{5})\b/)?.[1] ?? null;
  const streetIndex = segments.findIndex(isStreetSegment);
  const streetSegment = streetIndex >= 0 ? segments[streetIndex] : null;
  const venue =
    streetIndex > 0
      ? segments.slice(0, streetIndex).join(" · ")
      : streetIndex === -1 && segments.length > 1
        ? segments[0]
        : null;

  const remainder = segments.filter((_, index) => index !== streetIndex);
  const cityCandidate = remainder[remainder.length - 1];
  const city = cityCandidate && isLikelyCitySegment(cityCandidate)
    ? cityCandidate
    : null;

  const postalInStreet = streetSegment?.match(/\b(\d{5})\b/)?.[1] ?? null;
  const postalCode = postalInStreet ?? postalFromRaw;
  const streetLine = streetSegment
    ? streetSegment
        .replace(/,?\s*\b\d{5}\b\s*[A-Za-zÀ-ÿ'’\s-]*$/i, "")
        .replace(/\s+/g, " ")
        .trim() || streetSegment
    : null;

  return {
    city,
    postalCode,
    raw: normalized,
    streetLine,
    venue,
  };
}

export function formatImportedAddressForForm(raw: string) {
  const parts = parseImportedAddressParts(raw);

  if (parts.streetLine && parts.postalCode && parts.city) {
    return `${parts.streetLine}, ${parts.postalCode} ${parts.city}`;
  }

  if (parts.streetLine && parts.postalCode) {
    return `${parts.streetLine}, ${parts.postalCode} Paris`;
  }

  if (parts.streetLine && parts.city) {
    return `${parts.streetLine}, ${parts.city}`;
  }

  if (parts.streetLine) {
    return parts.streetLine;
  }

  return raw
    .replace(/\s*·\s*/g, ", ")
    .replace(/,\s*(fr|france)\s*$/i, "")
    .trim();
}

export function buildGeocodingQueries(address: string, city: string) {
  const parts = parseImportedAddressParts(address);
  const effectiveCity = parts.city || city.trim();
  const queries: string[] = [];

  if (parts.streetLine && parts.postalCode && effectiveCity) {
    queries.push(
      `${parts.streetLine}, ${parts.postalCode} ${effectiveCity}, France`,
    );
  }

  if (parts.streetLine && parts.postalCode) {
    queries.push(`${parts.streetLine}, ${parts.postalCode} Paris, France`);
  }

  if (parts.streetLine && effectiveCity) {
    queries.push(`${parts.streetLine}, ${effectiveCity}, France`);
  }

  if (parts.postalCode && effectiveCity) {
    queries.push(`${parts.postalCode} ${effectiveCity}, France`);
  }

  if (parts.venue && parts.streetLine && effectiveCity) {
    queries.push(`${parts.venue}, ${parts.streetLine}, ${effectiveCity}, France`);
  }

  if (parts.venue && effectiveCity) {
    queries.push(`${parts.venue}, ${effectiveCity}, France`);
  }

  const compact = address
    .replace(/\s*·\s*/g, ", ")
    .replace(/,\s*(fr|france)\s*$/i, ", France");

  queries.push(compact);

  if (effectiveCity && !compact.toLowerCase().includes(effectiveCity.toLowerCase())) {
    queries.push(`${compact}, ${effectiveCity}, France`);
  }

  return [...new Set(queries.map((query) => query.trim()).filter(Boolean))];
}

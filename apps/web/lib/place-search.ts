export type ImportedAddressParts = {
  city: string | null;
  postalCode: string | null;
  raw: string;
  streetLine: string | null;
  venue: string | null;
};

const COUNTRY_TOKENS = /^(fr|france|frança|french)$/i;

const PARIS_ARRONDISSEMENT_POSTAL: Record<number, string> = {
  1: "75001",
  2: "75002",
  3: "75003",
  4: "75004",
  5: "75005",
  6: "75006",
  7: "75007",
  8: "75008",
  9: "75009",
  10: "75010",
  11: "75011",
  12: "75012",
  13: "75013",
  14: "75014",
  15: "75015",
  16: "75016",
  17: "75017",
  18: "75018",
  19: "75019",
  20: "75020",
};

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

function expandChineseParisAddressQueries(address: string) {
  const queries: string[] = [];
  const labeledAddress = address.match(
    /巴黎\s*(\d{1,2})\s*区\s*(?:阿尔贝尔|Albert)\s*街\s*(\d+)?/i,
  );
  const reverseDistrict = address.match(
    /(?:阿尔贝尔|Albert)\s*街.*巴黎\s*(\d{1,2})\s*区/i,
  );
  const arrondissement = Number(
    labeledAddress?.[1] ?? reverseDistrict?.[1] ?? "",
  );
  const streetNumber = labeledAddress?.[2] ?? null;
  const postal = PARIS_ARRONDISSEMENT_POSTAL[arrondissement];

  if (!postal) {
    return queries;
  }

  const streetLine = streetNumber
    ? `${streetNumber} Rue Albert`
    : "Rue Albert";

  queries.push(`${streetLine}, ${postal} Paris, France`);
  queries.push(`Rue Albert, ${postal} Paris, France`);
  queries.push(`${postal} Paris, France`);

  return queries;
}

export function formatImportedAddressForForm(raw: string) {
  const chineseFormatted = expandChineseParisAddressQueries(raw)[0]
    ?.replace(/, France$/, "");

  if (chineseFormatted) {
    return chineseFormatted;
  }

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
  const queries: string[] = [...expandChineseParisAddressQueries(address)];

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

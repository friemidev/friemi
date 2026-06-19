type GoogleMapsSearchInput = {
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  queryAddress?: string | null;
};

function normalizeMapText(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeComparableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function hasUsableCoordinate(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value);
}

function isGenericAddress(address: string, city: string) {
  const normalizedAddress = normalizeComparableText(address);
  const normalizedCity = normalizeComparableText(city);

  if (!normalizedAddress) {
    return true;
  }

  return (
    normalizedAddress === normalizedCity ||
    normalizedAddress === "paris" ||
    normalizedAddress === "paris, france" ||
    normalizedAddress === "paris france" ||
    normalizedAddress === "france"
  );
}

function getAddressQuery(address: string, city: string) {
  if (!address) {
    return city || null;
  }

  if (city && !address.toLowerCase().includes(city.toLowerCase())) {
    return `${address}, ${city}`;
  }

  return address;
}

export function getGoogleMapsQuery(input: GoogleMapsSearchInput) {
  const address = normalizeMapText(input.queryAddress ?? input.address);
  const city = normalizeMapText(input.city);
  const addressQuery = getAddressQuery(address, city);
  if (
    hasUsableCoordinate(input.latitude) &&
    hasUsableCoordinate(input.longitude) &&
    (!addressQuery || isGenericAddress(address, city))
  ) {
    return `${input.latitude},${input.longitude}`;
  }

  return addressQuery;
}

export function getGoogleMapsSearchUrl(input: GoogleMapsSearchInput) {
  const query = getGoogleMapsQuery(input);

  if (!query) {
    return null;
  }

  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", query);

  return url.toString();
}

export type GeoCoordinates = {
  latitude: number;
  longitude: number;
};

export function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(numberValue) ? numberValue : null;
}

export function isValidGeoCoordinates(
  latitude: number | null,
  longitude: number | null,
): latitude is number {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function coordinatesFromPair(
  latitude: number | null,
  longitude: number | null,
): GeoCoordinates | null {
  if (latitude === null || longitude === null) {
    return null;
  }

  if (!isValidGeoCoordinates(latitude, longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function coordinatesFromString(value: string): GeoCoordinates | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const commaParts = trimmed.split(",").map((part) => part.trim());

  if (commaParts.length >= 2) {
    return coordinatesFromPair(
      parseCoordinate(commaParts[0]),
      parseCoordinate(commaParts[1]),
    );
  }

  const spaceParts = trimmed.split(/\s+/).filter(Boolean);

  if (spaceParts.length >= 2) {
    return coordinatesFromPair(
      parseCoordinate(spaceParts[0]),
      parseCoordinate(spaceParts[1]),
    );
  }

  return null;
}

function coordinatesFromRecord(
  record: Record<string, unknown>,
): GeoCoordinates | null {
  const direct = coordinatesFromPair(
    parseCoordinate(record.latitude ?? record.lat),
    parseCoordinate(record.longitude ?? record.lon ?? record.lng),
  );

  if (direct) {
    return direct;
  }

  const geo = record.geo;

  if (typeof geo === "string") {
    return coordinatesFromString(geo);
  }

  if (geo && typeof geo === "object") {
    return extractGeoCoordinatesFromJsonLdLocation(geo);
  }

  return null;
}

function isGeoCoordinatesNode(record: Record<string, unknown>) {
  const typeValue = record["@type"];
  const types = Array.isArray(typeValue)
    ? typeValue.map((entry) => String(entry).toLowerCase())
    : [String(typeValue ?? "").toLowerCase()];

  return types.some((type) => type.includes("geocoordinates"));
}

/**
 * Extract latitude/longitude from schema.org Event.location, Place, or GeoCoordinates nodes.
 */
export function extractGeoCoordinatesFromJsonLdLocation(
  location: unknown,
): GeoCoordinates | null {
  if (!location) {
    return null;
  }

  if (typeof location === "string") {
    return coordinatesFromString(location);
  }

  if (Array.isArray(location)) {
    for (const entry of location) {
      const coordinates = extractGeoCoordinatesFromJsonLdLocation(entry);

      if (coordinates) {
        return coordinates;
      }
    }

    return null;
  }

  if (typeof location !== "object") {
    return null;
  }

  const record = location as Record<string, unknown>;

  if (isGeoCoordinatesNode(record)) {
    return coordinatesFromRecord(record);
  }

  const nestedGeo = record.geo;

  if (nestedGeo) {
    const coordinates = extractGeoCoordinatesFromJsonLdLocation(nestedGeo);

    if (coordinates) {
      return coordinates;
    }
  }

  return coordinatesFromRecord(record);
}

export function extractCoordinatesFromRecord(
  record: Record<string, unknown> | undefined | null,
): GeoCoordinates | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  return coordinatesFromRecord(record);
}

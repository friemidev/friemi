import assert from "node:assert/strict";
import test from "node:test";
import {
  extractCoordinatesFromRecord,
  extractGeoCoordinatesFromJsonLdLocation,
  isValidGeoCoordinates,
  parseCoordinate,
} from "./geo";

test("parseCoordinate accepts numbers and numeric strings", () => {
  assert.equal(parseCoordinate("48.8566"), 48.8566);
  assert.equal(parseCoordinate(""), null);
  assert.equal(parseCoordinate("abc"), null);
});

test("extractGeoCoordinatesFromJsonLdLocation reads GeoCoordinates nodes", () => {
  const coordinates = extractGeoCoordinatesFromJsonLdLocation({
    "@type": "GeoCoordinates",
    latitude: 48.87,
    longitude: 2.33,
  });

  assert.deepEqual(coordinates, { latitude: 48.87, longitude: 2.33 });
});

test("extractGeoCoordinatesFromJsonLdLocation reads nested geo on Place", () => {
  const coordinates = extractGeoCoordinatesFromJsonLdLocation({
    "@type": "Place",
    name: "Grand Rex",
    geo: {
      "@type": "GeoCoordinates",
      latitude: "48.8704",
      longitude: "2.3478",
    },
  });

  assert.deepEqual(coordinates, { latitude: 48.8704, longitude: 2.3478 });
});

test("extractGeoCoordinatesFromJsonLdLocation reads direct lat/lon on Place", () => {
  const coordinates = extractGeoCoordinatesFromJsonLdLocation({
    "@type": "Place",
    latitude: 48.86,
    longitude: 2.35,
  });

  assert.ok(isValidGeoCoordinates(coordinates?.latitude ?? null, coordinates?.longitude ?? null));
});

test("extractCoordinatesFromRecord supports meetup-style venue fields", () => {
  const coordinates = extractCoordinatesFromRecord({
    lat: 43.6045,
    lng: 1.444,
  });

  assert.deepEqual(coordinates, { latitude: 43.6045, longitude: 1.444 });
});

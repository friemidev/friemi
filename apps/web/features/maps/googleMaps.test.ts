import assert from "node:assert/strict";
import test from "node:test";
import { getGoogleMapsQuery, getGoogleMapsSearchUrl } from "./googleMaps";

test("uses coordinates before a generic city address", () => {
  assert.equal(
    getGoogleMapsQuery({
      address: "Paris",
      city: "Paris",
      latitude: 48.8566,
      longitude: 2.3522,
    }),
    "48.8566,2.3522",
  );
});

test("uses concrete address before coordinates so Google can show a place", () => {
  assert.equal(
    getGoogleMapsQuery({
      address: "Paris · 14 rue de Madrid",
      city: "Paris",
      latitude: 48.8795,
      longitude: 2.319,
      queryAddress: "14 rue de Madrid",
    }),
    "14 rue de Madrid, Paris",
  );
});

test("combines address and city when coordinates are unavailable", () => {
  assert.equal(
    getGoogleMapsQuery({
      address: "14 rue de Madrid",
      city: "Paris",
    }),
    "14 rue de Madrid, Paris",
  );
});

test("does not duplicate the city when the address already contains it", () => {
  assert.equal(
    getGoogleMapsQuery({
      address: "14 rue de Madrid, Paris",
      city: "Paris",
    }),
    "14 rue de Madrid, Paris",
  );
});

test("returns null when no map query data is available", () => {
  assert.equal(getGoogleMapsSearchUrl({ address: " ", city: null }), null);
});

test("builds a Google Maps URL with api=1", () => {
  const url = getGoogleMapsSearchUrl({
    address: "Paris",
    city: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
  });

  assert.ok(url);
  assert.match(url, /^https:\/\/www\.google\.com\/maps\/search\//);
  assert.match(url, /api=1/);
  assert.match(url, /query=48\.8566%2C2\.3522/);
});

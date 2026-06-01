import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGeocodingQueries,
  formatImportedAddressForForm,
  parseImportedAddressParts,
} from "./place-search";

test("formatImportedAddressForForm normalizes venue-prefixed Paris addresses", () => {
  const formatted = formatImportedAddressForForm(
    "Fondation Maison des sciences de l'homme (FMSH) · 54 Boulevard Raspail, 75006 Paris · Paris · FR",
  );

  assert.equal(formatted, "54 Boulevard Raspail, 75006 Paris");
});

test("formatImportedAddressForForm normalizes Toulouse venue addresses", () => {
  const formatted = formatImportedAddressForForm(
    "Baraka Jeux · 1 boulevard de la Gare · Toulouse · fr",
  );

  assert.equal(formatted, "1 boulevard de la Gare, Toulouse");
});

test("buildGeocodingQueries prioritizes street and postal code", () => {
  const queries = buildGeocodingQueries(
    "Baraka Jeux · 1 boulevard de la Gare · Toulouse · fr",
    "Paris",
  );

  assert.ok(
    queries.some((query) =>
      /1 boulevard de la Gare,\s*Toulouse,\s*France/i.test(query),
    ),
  );
});

test("formatImportedAddressForForm converts Chinese Paris district streets", () => {
  const formatted = formatImportedAddressForForm("巴黎13区 阿尔贝尔街");

  assert.equal(formatted, "Rue Albert, 75013 Paris");
});

test("buildGeocodingQueries expands Chinese Paris district addresses", () => {
  const queries = buildGeocodingQueries("巴黎13区 阿尔贝尔街", "Paris");

  assert.ok(
    queries.some((query) => /rue Albert,\s*75013 Paris,\s*France/i.test(query)),
  );
});

test("parseImportedAddressParts extracts postal code from street segment", () => {
  const parts = parseImportedAddressParts(
    "Fondation Maison des sciences de l'homme (FMSH) · 54 Boulevard Raspail, 75006 Paris · Paris · FR",
  );

  assert.equal(parts.postalCode, "75006");
  assert.match(parts.streetLine ?? "", /Boulevard Raspail/i);
  assert.equal(parts.city, "Paris");
});

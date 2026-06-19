import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublicEventLocationDisplay,
  isGenericPublicEventAddress,
} from "./locationDisplay";

test("detects Paris-only public event addresses as generic", () => {
  assert.equal(
    isGenericPublicEventAddress({
      address: "Paris",
      city: "Paris",
      latitude: 48.8566,
      longitude: 2.3522,
    }),
    true,
  );
});

test("keeps concrete public event addresses unchanged", () => {
  const location = getPublicEventLocationDisplay(
    {
      address: "54 Boulevard Raspail, 75006 Paris",
      city: "Paris",
      latitude: 48.8508,
      longitude: 2.3266,
    },
    "zh-CN",
  );

  assert.equal(location.displayLabel, "54 Boulevard Raspail, 75006 Paris");
  assert.equal(location.copyValue, "54 Boulevard Raspail, 75006 Paris");
  assert.equal(location.isGenericAddress, false);
});

test("uses map pin fallback for generic address with coordinates", () => {
  const location = getPublicEventLocationDisplay(
    {
      address: "Paris",
      city: "Paris",
      latitude: 48.8566,
      longitude: 2.3522,
    },
    "zh-CN",
  );

  assert.equal(location.displayLabel, "地图定位可用，具体地址以官方页面为准");
  assert.match(location.copyValue, /来源地址: Paris/);
  assert.match(location.copyValue, /48\.8566, 2\.3522/);
  assert.match(location.copyValue, /google\.com\/maps\/search/);
  assert.match(location.copyValue, /query=48\.8566%2C2\.3522/);
});

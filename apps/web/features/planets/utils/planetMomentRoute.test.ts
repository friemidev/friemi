import assert from "node:assert/strict";
import test from "node:test";
import { buildPlanetMomentRedirectHref } from "./planetMomentRoute";

test("old planet moment links redirect to the embedded moment panel", () => {
  assert.equal(
    buildPlanetMomentRedirectHref({
      locale: "zh-CN",
      momentId: "moment-123",
      planetSlug: "board-game-planet",
    }),
    "/zh-CN/planets/board-game-planet?moment=moment-123#planet-moment",
  );
});

test("planet moment redirect paths encode dynamic route values", () => {
  assert.equal(
    buildPlanetMomentRedirectHref({
      locale: "fr",
      momentId: "moment avec espace",
      planetSlug: "planete privee",
    }),
    "/fr/planets/planete%20privee?moment=moment%20avec%20espace#planet-moment",
  );
});

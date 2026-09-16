import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlatformCouponImageUrl,
  getPlatformCouponTemplate,
  getPlatformCouponTemplateBySlug,
  platformCouponTemplates,
} from "./platformCouponTemplates";

test("platform coupon catalog exposes the omelette rice promotion", () => {
  const template = getPlatformCouponTemplate("omeriz-omelette-rice-promo");

  assert.ok(template);
  assert.equal(template.slug, "omeriz-omelette-rice-promo");
  assert.equal(
    template.imageUrl,
    "/items/coupon/001_momentea/omelette-rice-promo.png",
  );
  assert.equal(platformCouponTemplates.length, 1);
});

test("platform coupon assets resolve only for known coupon slugs", () => {
  assert.equal(
    getPlatformCouponTemplateBySlug("omeriz-omelette-rice-promo")?.key,
    "omeriz-omelette-rice-promo",
  );
  assert.equal(
    getPlatformCouponImageUrl("omeriz-omelette-rice-promo"),
    "/items/coupon/001_momentea/omelette-rice-promo.png",
  );
  assert.equal(getPlatformCouponImageUrl("custom-coupon"), null);
});

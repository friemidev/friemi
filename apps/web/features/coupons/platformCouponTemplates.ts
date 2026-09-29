export type PlatformCouponTemplate = {
  accentColor: string;
  backgroundColor: string;
  description: string;
  foregroundColor: string;
  imageUrl: string;
  key: string;
  slug: string;
  terms: string;
  title: string;
};

export const platformCouponTemplates = [
  {
    accentColor: "#FF6159",
    backgroundColor: "#FFFDF7",
    description:
      "到店出示此券，可享滑蛋饭专属优惠。具体优惠内容以门店现场说明为准。",
    foregroundColor: "#075C4C",
    imageUrl: "/items/coupon/001_momentea/omelette-rice-promo.png",
    key: "omeriz-omelette-rice-promo",
    slug: "omeriz-omelette-rice-promo",
    terms: "仅限绑定门店核销，不可转让或兑换现金。同一账号每期优惠券限领一次。",
    title: "滑蛋饭 Promo",
  },
] as const satisfies readonly PlatformCouponTemplate[];

export type PlatformCouponTemplateKey =
  (typeof platformCouponTemplates)[number]["key"];

export function getPlatformCouponTemplate(key: string) {
  return (
    platformCouponTemplates.find((template) => template.key === key) ?? null
  );
}

export function getPlatformCouponTemplateBySlug(slug: string) {
  return (
    platformCouponTemplates.find((template) => template.slug === slug) ?? null
  );
}

export function getPlatformCouponImageUrl(slug: string) {
  return getPlatformCouponTemplateBySlug(slug)?.imageUrl ?? null;
}

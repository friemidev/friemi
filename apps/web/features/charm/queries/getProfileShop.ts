import {
  charmGiftCatalog,
  getCharmGiftLabel,
  type CharmGiftCategory,
  type CharmGiftDefinition,
  type CharmLocale,
} from "../charm";

export type ProfileShopGiftItem = {
  availability: "available" | "seasonal_locked";
  category: Exclude<CharmGiftCategory, "negative">;
  charmValue: number;
  coinCost: number | null;
  emoji: string;
  id: string;
  label: string;
  referenceRmb: number;
};

function isVisibleShopGift(gift: CharmGiftDefinition) {
  return (
    gift.launchEnabled && gift.charmValue > 0 && gift.category !== "negative"
  );
}

export function getProfileShopGiftCatalog(locale: CharmLocale) {
  return charmGiftCatalog
    .filter(isVisibleShopGift)
    .map((gift): ProfileShopGiftItem => {
      return {
        availability:
          gift.availability === "seasonal" ? "seasonal_locked" : "available",
        category: gift.category as Exclude<CharmGiftCategory, "negative">,
        charmValue: gift.charmValue,
        coinCost: gift.coinCost,
        emoji: gift.emoji,
        id: gift.id,
        label: getCharmGiftLabel(gift, locale),
        referenceRmb: gift.referenceRmb,
      };
    })
    .sort((a, b) => {
      if (a.availability !== b.availability) {
        return a.availability === "available" ? -1 : 1;
      }

      return a.charmValue - b.charmValue || a.label.localeCompare(b.label);
    });
}

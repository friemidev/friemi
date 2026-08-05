import {
  charmGiftCatalog,
  getCharmGiftLabel,
  type CharmGiftCategory,
  type CharmGiftDefinition,
  type CharmLocale,
} from "../charm";

export type ProfileShopGiftItem = {
  availability: "available" | "seasonal_locked" | "disabled";
  category: CharmGiftCategory;
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

function toProfileShopGiftItem(
  gift: CharmGiftDefinition,
  locale: CharmLocale,
): ProfileShopGiftItem {
  return {
    availability:
      gift.availability === "disabled"
        ? "disabled"
        : gift.availability === "seasonal"
          ? "seasonal_locked"
          : "available",
    category: gift.category,
    charmValue: gift.charmValue,
    coinCost: gift.coinCost,
    emoji: gift.emoji,
    id: gift.id,
    label: getCharmGiftLabel(gift, locale),
    referenceRmb: gift.referenceRmb,
  };
}

export function getProfileShopGiftCatalog(locale: CharmLocale) {
  return charmGiftCatalog
    .filter(isVisibleShopGift)
    .map((gift) => toProfileShopGiftItem(gift, locale))
    .sort((a, b) => {
      if (a.availability !== b.availability) {
        return a.availability === "available" ? -1 : 1;
      }

      return (
        (a.coinCost ?? Number.MAX_SAFE_INTEGER) -
          (b.coinCost ?? Number.MAX_SAFE_INTEGER) ||
        a.charmValue - b.charmValue ||
        a.label.localeCompare(b.label)
      );
    });
}

export function getProfileShopNegativeGiftCatalog(locale: CharmLocale) {
  return charmGiftCatalog
    .filter((gift) => gift.category === "negative")
    .map((gift) => toProfileShopGiftItem(gift, locale))
    .sort((a, b) => {
      return (
        (a.coinCost ?? Number.MAX_SAFE_INTEGER) -
          (b.coinCost ?? Number.MAX_SAFE_INTEGER) ||
        a.label.localeCompare(b.label)
      );
    });
}

import {
  isWerewolfRoleKey,
  type WerewolfRoleKey,
} from "@/features/game-tools/werewolfConfig";

const WEREWOLF_CARD_ASSET_BASE = "/game-tools/werewolf";
const WEREWOLF_CARD_LOCALE_FALLBACK = "en";
const WEREWOLF_CARD_BACK_MIN = 1;
const WEREWOLF_CARD_BACK_MAX = 12;

function getWerewolfCardLocale(locale: string) {
  if (locale === "en") {
    return "en";
  }

  return WEREWOLF_CARD_LOCALE_FALLBACK;
}

export function getWerewolfRoleCardImage(
  roleKey: string | null | undefined,
  locale: string,
) {
  if (!isWerewolfRoleKey(roleKey)) {
    return null;
  }

  const cardLocale = getWerewolfCardLocale(locale);

  return `${WEREWOLF_CARD_ASSET_BASE}/recto/${roleKey}_${cardLocale}.png`;
}

export function getWerewolfSeatBackImage(seatNumber: number) {
  if (!Number.isFinite(seatNumber)) {
    return `${WEREWOLF_CARD_ASSET_BASE}/verso/${WEREWOLF_CARD_BACK_MIN}.png`;
  }

  const normalizedSeatNumber = Math.min(
    WEREWOLF_CARD_BACK_MAX,
    Math.max(WEREWOLF_CARD_BACK_MIN, Math.trunc(seatNumber)),
  );

  return `${WEREWOLF_CARD_ASSET_BASE}/verso/${normalizedSeatNumber}.png`;
}

export function hasWerewolfRoleCard(
  roleKey: string | null | undefined,
): roleKey is WerewolfRoleKey {
  return isWerewolfRoleKey(roleKey);
}

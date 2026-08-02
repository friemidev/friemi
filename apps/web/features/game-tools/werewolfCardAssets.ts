import {
  isWerewolfRoleKey,
  type WerewolfRoleKey,
} from "@/features/game-tools/werewolfConfig";

const WEREWOLF_CARD_ASSET_BASE = "/game-tools/werewolf";
const WEREWOLF_ATMOSPHERE_ASSET_BASE = `${WEREWOLF_CARD_ASSET_BASE}/atmosphere`;
const WEREWOLF_UI_ASSET_BASE = `${WEREWOLF_CARD_ASSET_BASE}/ui`;
const WEREWOLF_CARD_LOCALE_FALLBACK = "en";
const WEREWOLF_CARD_BACK_MIN = 1;
const WEREWOLF_CARD_BACK_MAX = 12;

export const werewolfAtmospheres = [
  {
    id: "moonlit-village-gate",
    name: "Moonlit Village Gate",
    size: "1080 x 1920",
    src: `${WEREWOLF_ATMOSPHERE_ASSET_BASE}/moonlit-village-gate-1080x1920.png`,
  },
  {
    id: "moon-gate-forest",
    name: "Moon Gate Forest",
    size: "1080 x 1920",
    src: `${WEREWOLF_ATMOSPHERE_ASSET_BASE}/moon-gate-forest-1080x1920.png`,
  },
  {
    id: "blood-moon-lakeside",
    name: "Blood Moon Lakeside",
    size: "1080 x 1920",
    src: `${WEREWOLF_ATMOSPHERE_ASSET_BASE}/blood-moon-lakeside-1080x1920.png`,
  },
  {
    id: "rose-corridor",
    name: "Rose Corridor",
    size: "1080 x 1920",
    src: `${WEREWOLF_ATMOSPHERE_ASSET_BASE}/rose-corridor-1080x1920.png`,
  },
  {
    id: "witch-herb-garden",
    name: "Witch Herb Garden",
    size: "1080 x 1920",
    src: `${WEREWOLF_ATMOSPHERE_ASSET_BASE}/witch-herb-garden-1080x1920.png`,
  },
  {
    id: "night-watch-tower",
    name: "Night Watch Tower",
    size: "1080 x 1920",
    src: `${WEREWOLF_ATMOSPHERE_ASSET_BASE}/night-watch-tower-1080x1920.png`,
  },
  {
    id: "star-altar",
    name: "Star Altar",
    size: "1080 x 1920",
    src: `${WEREWOLF_ATMOSPHERE_ASSET_BASE}/star-altar-1080x1920.png`,
  },
  {
    id: "lantern-square-cards",
    name: "Lantern Square Cards",
    size: "1080 x 1920",
    src: `${WEREWOLF_ATMOSPHERE_ASSET_BASE}/lantern-square-cards-1080x1920.png`,
  },
] as const;

export type WerewolfAtmosphereId = (typeof werewolfAtmospheres)[number]["id"];

export const defaultWerewolfAtmosphere = werewolfAtmospheres[0];

export function getWerewolfAtmosphereById(
  atmosphereId: string | null | undefined,
) {
  return (
    werewolfAtmospheres.find((atmosphere) => atmosphere.id === atmosphereId) ??
    defaultWerewolfAtmosphere
  );
}

export const werewolfUiAssets = {
  actionCoverCard: `${WEREWOLF_UI_ASSET_BASE}/action-cover-card.svg`,
  actionRevealCard: `${WEREWOLF_UI_ASSET_BASE}/action-reveal-card.svg`,
  deathBloodDripEffect: `${WEREWOLF_UI_ASSET_BASE}/death-blood-drip-effect.svg`,
  deathOverlayMask: `${WEREWOLF_UI_ASSET_BASE}/death-overlay-mask.svg`,
  qrCornerFrame: `${WEREWOLF_UI_ASSET_BASE}/qr-corner-frame.svg`,
  resultGoodBadge: `${WEREWOLF_UI_ASSET_BASE}/result-good-badge.svg`,
  resultWerewolfBadge: `${WEREWOLF_UI_ASSET_BASE}/result-werewolf-badge.svg`,
  revealConfirmMark: `${WEREWOLF_UI_ASSET_BASE}/reveal-confirm-mark.svg`,
  seatJudge: `${WEREWOLF_UI_ASSET_BASE}/seat-judge.svg`,
  seatPlayerDead: `${WEREWOLF_UI_ASSET_BASE}/seat-player-out.svg`,
  seatPlayerEmpty: `${WEREWOLF_UI_ASSET_BASE}/seat-player-empty.svg`,
  seatPlayerOccupied: `${WEREWOLF_UI_ASSET_BASE}/seat-player-occupied.svg`,
  seatPlayerReady: `${WEREWOLF_UI_ASSET_BASE}/seat-player-ready.svg`,
  testOnlyBadge: `${WEREWOLF_UI_ASSET_BASE}/test-only-badge.svg`,
  timelineEventDot: `${WEREWOLF_UI_ASSET_BASE}/timeline-event-dot.svg`,
} as const;

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

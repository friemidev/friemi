"use client";
import type { DdzCard } from "../doudizhuTypes";
import s from "./DoudizhuGame.module.css";
const suits = { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" };
export function doudizhuCardRank(card: DdzCard) {
  return card.rank === 14
    ? "A"
    : card.rank === 15
      ? "2"
      : card.rank === 13
        ? "K"
        : card.rank === 12
          ? "Q"
          : card.rank === 11
            ? "J"
            : card.rank > 15
              ? "JOKER"
              : String(card.rank);
}
export function doudizhuCardLabel(card: DdzCard, locale: string) {
  if (card.rank > 15)
    return locale === "zh-CN"
      ? card.rank === 17
        ? "大王"
        : "小王"
      : locale === "fr"
        ? card.rank === 17
          ? "Grand joker"
          : "Petit joker"
        : card.rank === 17
          ? "Big joker"
          : "Small joker";
  const names =
    locale === "zh-CN"
      ? { clubs: "梅花", diamonds: "方块", hearts: "红桃", spades: "黑桃" }
      : locale === "fr"
        ? {
            clubs: "trèfle",
            diamonds: "carreau",
            hearts: "cœur",
            spades: "pique",
          }
        : {
            clubs: "clubs",
            diamonds: "diamonds",
            hearts: "hearts",
            spades: "spades",
          };
  return `${doudizhuCardRank(card)} ${card.suit ? names[card.suit] : ""}`;
}
export function DoudizhuCardFace({
  card,
  back = false,
}: {
  card?: DdzCard;
  back?: boolean;
}) {
  const red =
    card?.suit === "hearts" || card?.suit === "diamonds" || card?.rank === 17;
  return (
    <svg
      viewBox="0 0 72 104"
      className={`${s.cardFace} ${red ? s.redCard : ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="70"
        height="102"
        rx="9"
        fill="var(--ddz-paper)"
        stroke="var(--ddz-border)"
        strokeWidth="1.3"
      />
      {back || !card ? (
        <>
          <rect
            x="6"
            y="6"
            width="60"
            height="92"
            rx="5"
            fill="var(--ddz-sky)"
          />
          <path
            d="M12 18 60 86M12 42 48 94M24 10 60 62M12 86 60 18M12 62 48 10M24 94 60 42"
            stroke="var(--ddz-mist)"
            opacity=".32"
            strokeWidth="2"
          />
          <circle cx="36" cy="52" r="15" fill="var(--ddz-paper)" />
          <path
            d="m26 49 1-11 7 6h5l7-6 1 12c3 10-6 15-11 15s-14-5-10-15"
            fill="var(--ddz-butter)"
            stroke="var(--ddz-ink)"
            strokeWidth="1.5"
          />
          <path
            d="M30 51h1m9 0h1m-7 5 2 2 2-2"
            stroke="var(--ddz-ink)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : card.rank > 15 ? (
        <>
          <text
            x="11"
            y="16"
            fontSize="11"
            fontWeight="800"
            textAnchor="middle"
            fill="currentColor"
          >
            {card.rank === 17 ? "★" : "☆"}
          </text>
          <text
            x="11"
            y="29"
            fontSize="11"
            fontWeight="800"
            textAnchor="middle"
            fill="currentColor"
          >
            {["J", "O", "K", "E", "R"].map((letter, index) => (
              <tspan x="11" dy={index ? 11 : 0} key={letter}>
                {letter}
              </tspan>
            ))}
          </text>
          <path
            d="m22 49 7-16 7 12 7-12 7 16-5 16H27z"
            fill="currentColor"
            opacity=".13"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M28 52h2m12 0h2m-14 7q6 5 12 0"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <text
            x="36"
            y="85"
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill="currentColor"
          >
            {card.rank === 17 ? "BIG" : "SMALL"}
          </text>
        </>
      ) : (
        <>
          <text
            x="5"
            y="25"
            fontSize="24"
            fontWeight="850"
            textLength={card.rank === 10 ? 20 : undefined}
            lengthAdjust={card.rank === 10 ? "spacingAndGlyphs" : undefined}
            fill="currentColor"
          >
            {doudizhuCardRank(card)}
          </text>
          <text x="6" y="45" fontSize="21" fill="currentColor">
            {suits[card.suit!]}
          </text>
          <text
            x="42"
            y="73"
            fontSize="37"
            textAnchor="middle"
            fill="currentColor"
          >
            {suits[card.suit!]}
          </text>
          <g transform="rotate(180 36 52)">
            <text
              x="8"
              y="21"
              fontSize="16"
              fontWeight="800"
              fill="currentColor"
            >
              {doudizhuCardRank(card)}
            </text>
            <text x="8" y="35" fontSize="14" fill="currentColor">
              {suits[card.suit!]}
            </text>
          </g>
        </>
      )}
    </svg>
  );
}

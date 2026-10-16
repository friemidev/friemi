import type { CSSProperties } from "react";
import type { UnoColor } from "../unoTypes";
import styles from "./UnoCard.module.css";

export type UnoCardFaceProps = {
  card?: { id: string; color: UnoColor | null; value: string };
  back?: boolean;
  small?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** The parent button owns its translated accessible name and interaction. */
export function UnoCardFace({ card, back = false, small = false, className = "", style }: UnoCardFaceProps) {
  const isBack = back || !card;
  const value = card?.value ?? "";
  const tone = isBack ? "back" : card?.color ?? "wild";
  return (
    <span aria-hidden="true" className={`${styles.card} ${styles[tone]} ${small ? styles.small : ""} ${className}`} style={style}>
      <svg className={styles.art} viewBox="0 0 132 192" fill="none" focusable="false">
        <rect className={styles.paper} x="2" y="2" width="128" height="188" rx="15" strokeWidth="3" />
        {isBack ? <CardBack /> : (
          <>
            <rect className={styles.field} x="9" y="9" width="114" height="174" rx="10" />
            <path className={styles.faceOval} d="M101 46C121 64 112 115 85 142C65 163 35 164 24 143C12 121 23 75 48 52C66 35 86 32 101 46Z" />
            <g className={styles.corner} transform="translate(17 20)">
              <CardSymbol value={value} corner />
              <g transform="translate(3 27)"><ColorMark color={card?.color ?? null} /></g>
            </g>
            <g className={styles.corner} transform="translate(115 172) rotate(180)">
              <CardSymbol value={value} corner />
              <g transform="translate(3 27)"><ColorMark color={card?.color ?? null} /></g>
            </g>
            <g className={styles.mainSymbol} transform="translate(66 97) rotate(-9)">
              <CardSymbol value={value} />
            </g>
            <path className={styles.sheen} d="m104 23 7 0m-3.5-3.5v7M21 161h7m-3.5-3.5v7" strokeWidth="2.2" strokeLinecap="round" />
            {value === "6" || value === "9" ? <path className={styles.numberLine} d="M51 134h27" strokeWidth="4" strokeLinecap="round" /> : null}
          </>
        )}
      </svg>
    </span>
  );
}

function CardSymbol({ value, corner = false }: { value: string; corner?: boolean }) {
  const scale = corner ? "translate(8 10) scale(.3)" : undefined;
  if (/^\d$/.test(value)) {
    return <text className={corner ? styles.cornerNumber : styles.number} x={corner ? 8 : 0} y={corner ? 19 : 27} textAnchor="middle">{value}</text>;
  }
  return <g transform={scale}>
    {value === "skip" ? (
      <g stroke="currentColor" strokeWidth="9" strokeLinecap="round">
        <circle r="25" />
        <path d="m-18 18 36-36" />
      </g>
    ) : value === "reverse" ? (
      <g fill="currentColor">
        <path d="M-24 1v-8c0-14 11-25 25-25h5v-11l23 20L6-3v-12H1c-5 0-8 3-8 8v8z" />
        <path d="M24-1v8c0 14-11 25-25 25h-5v11l-23-20L-6 3v12h5c5 0 8-3 8-8v-8z" />
      </g>
    ) : value === "draw2" ? (
      <>
        {!corner && <g className={styles.drawCards} stroke="currentColor" strokeWidth="3.5">
          <rect x="-20" y="-42" width="24" height="33" rx="4" transform="rotate(-15 -8 -25)" />
          <rect x="-2" y="-39" width="24" height="33" rx="4" transform="rotate(13 10 -22)" />
        </g>}
        <text className={styles.plusNumber} y={corner ? 23 : 34} textAnchor="middle">+2</text>
      </>
    ) : value === "wild4" ? (
      <>
        {!corner && <g transform="translate(0 -27) scale(.62)"><WildFlower /></g>}
        <text className={styles.plusNumber} y={corner ? 23 : 35} textAnchor="middle">+4</text>
      </>
    ) : <WildFlower />}
  </g>;
}

function ColorMark({ color }: { color: UnoColor | null }) {
  if (color === "red") return <circle cx="5" cy="5" r="4" fill="currentColor" />;
  if (color === "yellow") return <path d="m5 0 5 9H0Z" fill="currentColor" />;
  if (color === "green") return <rect x="1" y="1" width="8" height="8" rx="1" fill="currentColor" />;
  if (color === "blue") return <path d="m5-1 5 6-5 6-5-6Z" fill="currentColor" />;
  return <path d="M5 0v10M0 5h10m-8-3 6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />;
}

function WildFlower() {
  return <g className={styles.flower} strokeWidth="2.5" strokeLinejoin="round">
    <path className={styles.flowerRed} d="M0 0C-31 7-36-18-20-29C-8-36 8-27 0 0Z" />
    <path className={styles.flowerYellow} d="M0 0C-7-31 18-36 29-20C36-8 27 8 0 0Z" />
    <path className={styles.flowerBlue} d="M0 0C31-7 36 18 20 29C8 36-8 27 0 0Z" />
    <path className={styles.flowerGreen} d="M0 0C7 31-18 36-29 20C-36 8-27-8 0 0Z" />
    <circle className={styles.flowerCenter} r="6" />
  </g>;
}

function CardBack() {
  return <>
    <rect className={styles.backField} x="9" y="9" width="114" height="174" rx="10" />
    <rect className={styles.backFrame} x="16" y="16" width="100" height="160" rx="7" strokeWidth="1.5" strokeDasharray="2 5" />
    <path className={styles.backBubble} d="M24 50c0-8 6-14 14-14h54c9 0 15 6 15 14v19c0 9-6 15-15 15H67L52 95l1-11H38c-8 0-14-6-14-15Z" />
    <text className={styles.backWordmark} x="66" y="66" textAnchor="middle" transform="rotate(-5 66 58)">friemi</text>
    <g transform="translate(68 121) rotate(14) scale(.75)"><WildFlower /></g>
    <text className={styles.backCaption} x="66" y="166" textAnchor="middle">CARD CLUB</text>
    <g className={styles.backDoodles} strokeWidth="2" strokeLinecap="round">
      <path d="m26 104 5-2m-6 11h5m65-17 4-5m0 13 6-1M29 144l-4 4m10 1-2 6m64-15 5 5" />
      <circle cx="102" cy="28" r="2" fill="currentColor" stroke="none" />
      <circle cx="31" cy="26" r="2" fill="currentColor" stroke="none" />
    </g>
  </>;
}

"use client";

import { useEffect, useId, useState } from "react";
import { getDrawGuessCat, type DrawGuessCatDirection, type DrawGuessCatId, type DrawGuessCatMood } from "@/features/game-tools/drawGuessCats";

type Cat = ReturnType<typeof getDrawGuessCat>;
type View = "front" | "quarter" | "side" | "backQuarter" | "back";
type EarStyle = "pointed" | "round" | "folded" | "tall" | "tufted";
type TailStyle = "curl" | "fluffy" | "straight" | "short";
export type DrawGuessCatPerformance = "default" | "champion" | "clap" | "wave";

const INK = "#57463F";
const SOFT_INK = "#8E7062";
const BLUSH = "#EAAE98";
export const DRAW_GUESS_CAT_FRAME_COUNT = 12;

const SHAPES: Record<View, { body: string; ears: string; innerEar: string; clothes: string }> = {
  front: {
    body: "M19 61C19 43 30 32 45 30Q60 25 76 30C92 33 101 45 101 62V76C101 94 84 104 60 104S19 94 19 76Z",
    ears: "M29 43 25 17Q25 12 30 14L47 32ZM73 32 90 14Q95 12 95 17L91 44Z",
    innerEar: "M32 30 30 20 40 32ZM80 32 90 20 88 31Z",
    clothes: "M20 78Q59 86 100 78V96Q84 106 59 106Q35 106 20 96Z",
  },
  quarter: {
    body: "M24 61C25 42 38 31 55 29Q78 25 91 38C100 46 103 57 103 68V77C103 94 87 104 63 104Q25 104 24 78Z",
    ears: "M35 42 32 17Q32 12 37 14L53 32ZM80 34 94 16Q98 13 99 19L96 46Z",
    innerEar: "M39 31 37 21 46 32ZM86 34 94 23 94 36Z",
    clothes: "M30 80Q65 88 102 77V97Q87 106 62 106Q41 106 30 98Z",
  },
  side: {
    body: "M31 61C31 42 44 30 62 29Q87 25 96 45L101 55Q110 58 109 66Q108 71 99 74V78C99 94 85 104 61 104Q31 104 31 78Z",
    ears: "M45 42 43 17Q44 11 49 14L65 32ZM76 34 86 18Q90 14 93 20L94 45Z",
    innerEar: "M49 31 49 21 57 33Z",
    clothes: "M32 79Q66 87 99 77V97Q84 106 60 106Q42 106 32 98Z",
  },
  backQuarter: {
    body: "M24 61C25 42 38 31 56 29Q79 25 92 39Q102 50 103 66V77C103 94 87 104 62 104Q24 104 24 78Z",
    ears: "M35 42 31 17Q31 12 37 14L53 32ZM78 34 92 16Q97 13 98 19L96 46Z",
    innerEar: "",
    clothes: "M25 77Q64 87 102 77V97Q85 107 62 107Q39 107 25 98Z",
  },
  back: {
    body: "M20 61C20 43 32 32 46 30Q60 26 74 30C90 33 100 45 100 62V76C100 94 83 104 60 104S20 94 20 76Z",
    ears: "M30 43 25 17Q25 12 30 14L47 32ZM73 32 90 14Q95 12 95 17L90 44Z",
    innerEar: "",
    clothes: "M21 77Q60 87 99 77V97Q83 107 60 107Q37 107 21 97Z",
  },
};

// Every character owns a silhouette, not just a palette. These choices survive at card size.
const DESIGNS: Record<DrawGuessCatId, { ears: EarStyle; tail: TailStyle }> = {
  scholar: { ears: "round", tail: "straight" },
  baker: { ears: "folded", tail: "curl" },
  explorer: { ears: "tall", tail: "straight" },
  cocoa: { ears: "round", tail: "short" },
  cloud: { ears: "tufted", tail: "fluffy" },
  artist: { ears: "pointed", tail: "curl" },
  captain: { ears: "tall", tail: "fluffy" },
  dreamer: { ears: "folded", tail: "short" },
  disco: { ears: "round", tail: "curl" },
  sunny: { ears: "pointed", tail: "straight" },
  calico: { ears: "folded", tail: "straight" },
  mocha: { ears: "pointed", tail: "short" },
  mango: { ears: "tufted", tail: "curl" },
  peach: { ears: "folded", tail: "fluffy" },
  inventor: { ears: "tall", tail: "curl" },
};

const EAR_VARIANTS: Record<Exclude<EarStyle, "pointed" | "tufted">, Record<"front" | "quarter" | "side", string>> = {
  round: {
    front: "M29 43Q24 30 27 21Q29 13 35 18L47 33ZM73 33 85 18Q92 13 94 21Q97 30 91 43Z",
    quarter: "M35 42Q30 29 33 21Q35 14 41 18L53 33ZM80 34 90 18Q97 14 99 22Q101 32 96 45Z",
    side: "M45 42Q41 30 44 21Q46 14 52 19L65 33ZM76 34 84 21Q90 16 94 22Q98 33 94 45Z",
  },
  folded: {
    front: "M29 43 27 22Q29 16 35 19L41 24 35 27 48 34ZM73 34 85 20Q91 15 95 18L92 27 86 27 91 43Z",
    quarter: "M35 42 33 23Q35 16 41 20L46 25 40 28 53 34ZM80 35 91 19Q97 15 99 20L96 29 91 29 96 45Z",
    side: "M45 42 44 22Q47 16 52 20L57 25 52 28 65 34ZM77 35 86 20Q91 16 94 21L93 30 88 30 94 45Z",
  },
  tall: {
    front: "M29 43 24 10Q24 6 29 9L49 33ZM71 33 91 9Q96 6 96 10L91 43Z",
    quarter: "M35 42 30 10Q30 6 35 9L55 33ZM79 34 96 10Q100 7 101 12L96 45Z",
    side: "M45 42 41 9Q42 5 47 9L66 33ZM76 34 89 11Q93 7 97 13L95 45Z",
  },
};

function earsFor(cat: Cat, view: View) {
  const style = DESIGNS[cat.id].ears;
  if (style === "pointed" || style === "tufted") return SHAPES[view].ears;
  const position = view === "front" || view === "back" ? "front" : view === "side" ? "side" : "quarter";
  return EAR_VARIANTS[style][position];
}

function tailFor(cat: Cat, view: View) {
  const side = view === "quarter" || view === "side" || view === "backQuarter";
  switch (DESIGNS[cat.id].tail) {
    case "fluffy":
      return side ? "M37 79Q17 64 10 72Q3 78 10 89Q5 97 17 100Q31 104 38 90Z" : "M91 79Q109 65 116 73Q122 82 113 91Q117 99 106 101Q94 103 89 90Z";
    case "straight":
      return side ? "M36 79Q15 72 13 53Q10 47 7 53Q3 81 24 93Q31 96 37 89Z" : "M92 79Q110 67 110 51Q111 45 115 51Q121 79 103 93Q96 97 91 89Z";
    case "short":
      return side ? "M36 80Q22 75 16 83Q12 90 21 93Q30 96 37 90Z" : "M91 80Q105 74 111 83Q115 91 105 94Q97 96 91 90Z";
    default:
      return side ? "M36 79Q17 66 10 79Q4 91 16 97Q27 103 31 90Q34 82 24 82Q19 83 21 89" : "M91 79Q109 67 115 80Q120 91 108 97Q97 103 94 90Q92 82 103 82Q108 83 106 89";
  }
}

function motionAt(mood: DrawGuessCatMood, frame: number, performance: DrawGuessCatPerformance) {
  const idleY = [0, 0, -.4, -.8, -1.2, -1, -.5, 0, .2, 0, 0, 0];
  const happyY = [0, 1.5, 3.5, -2, -8, -13, -13, -9, -3, 2.5, -2, 0];
  const happyTilt = [0, -1, -2, 2, 4, 3, 0, -3, -2, 1, 1, 0];
  const happySquash = [1, .96, .88, 1.08, 1.06, 1.02, 1.02, 1.04, .98, .9, 1.04, 1];
  const happyArms = [0, 0, 2, 6, 10, 13, 13, 9, 4, 0, 2, 0];
  const sadY = [0, .5, 1.5, 2.5, 3.5, 4, 4, 3.5, 2.5, 1.5, .5, 0];
  const sadTilt = [0, -.5, -1, -2, -3, -4, -4, -3.5, -2.5, -1.5, -.5, 0];
  if (mood === "idle") {
    return {
      y: idleY[frame], tilt: [0, .2, .4, .6, .7, .5, 0, -.3, -.5, -.2, 0, 0][frame],
      scaleX: 1, scaleY: [1, 1, 1.01, 1.015, 1.02, 1.015, 1, .995, 1, 1, 1, 1][frame],
      leftLift: [0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0][frame], rightLift: 0,
      handsIn: 0, rightOut: 0, footStep: [0, 0, .5, 1, 1, .5, 0, -.5, -1, -.5, 0, 0][frame],
      tailY: [0, 0, -1, -2, -2, -1, 0, 1, 2, 1, 0, 0][frame],
    };
  }
  if (mood === "sad") {
    return {
      y: sadY[frame], tilt: sadTilt[frame],
      scaleX: [1, 1, 1.01, 1.02, 1.03, 1.04, 1.04, 1.03, 1.02, 1.01, 1, 1][frame],
      scaleY: [1, .99, .97, .95, .93, .92, .92, .93, .95, .97, .99, 1][frame],
      leftLift: 0, rightLift: 0, handsIn: 0, rightOut: 0, footStep: 0,
      tailY: [0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0][frame],
    };
  }
  const arms = happyArms[frame];
  const onAction = frame >= 3 && frame <= 8;
  return {
    y: happyY[frame] * (performance === "champion" ? 1.2 : performance === "default" ? 1 : .32),
    tilt: happyTilt[frame] * (performance === "wave" ? 1.4 : .8),
    scaleX: 2 - happySquash[frame],
    scaleY: happySquash[frame],
    leftLift: performance === "wave" ? arms * .35 : performance === "clap" ? arms * .52 : arms,
    rightLift: performance === "wave" ? arms * 1.35 : performance === "clap" ? arms * .52 : arms * .9,
    handsIn: performance === "clap" && onAction ? [0, 0, 0, 4, 13, 22, 22, 13, 4, 0, 0, 0][frame] : 0,
    rightOut: performance === "wave" && onAction ? [0, 0, 0, 2, 5, 8, 8, 5, 2, 0, 0, 0][frame] : 0,
    footStep: [0, 0, 1, 2, 1, 0, 0, -1, -2, 0, 1, 0][frame],
    tailY: [0, -1, -3, -5, -6, -4, -2, 1, 3, 2, 1, 0][frame],
  };
}

function mix(a: string, b: string, amount: number) {
  const read = (hex: string, index: number) => parseInt(hex.slice(index, index + 2), 16);
  const channel = (index: number) => Math.round(read(a, index) * (1 - amount) + read(b, index) * amount).toString(16).padStart(2, "0");
  return "#" + channel(1) + channel(3) + channel(5);
}

function Hat({ cat, back, side }: { cat: Cat; back: boolean; side: boolean }) {
  switch (cat.hat) {
    case "cap":
      return <g stroke={INK} strokeLinejoin="round" strokeWidth="2.4">
        <path d="M34 30Q37 13 53 10Q75 5 88 25L86 31Q62 38 34 30Z" fill={cat.id === "explorer" ? "#68A6C8" : "#728CB3"} />
        <path d="M34 29Q61 36 89 27L91 32Q63 41 33 34Z" fill={cat.id === "explorer" ? "#397FA7" : "#536D99"} />
        {!back && <path d={side ? "M74 32Q94 29 102 35Q93 39 78 38" : "M70 34Q88 31 97 36Q84 43 65 39"} fill="#426F98" />}
        <circle cx="60" cy="12" r="2.2" fill="#F7DC92" stroke="none" />
        {cat.id === "scholar" && <path d="M51 22h17" stroke="#EEDC9E" strokeWidth="2" strokeLinecap="round" />}
      </g>;
    case "beret":
      return <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round"><path d="M32 28Q34 12 58 12Q81 9 91 22Q80 33 54 33Q40 33 32 28Z" fill="#D77F72" /><path d="M37 30Q61 36 87 26" stroke="#AF5F59" fill="none" /><path d="m57 14 2-8" strokeLinecap="round" /><path d="M47 19q10-5 21-2" stroke="#F8B6A2" strokeWidth="2" fill="none" strokeLinecap="round" /></g>;
    case "crown":
      return <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round"><path d="m36 28-3-20 14 10L60 5l13 13L87 8l-3 20Z" fill="#F3CB68" /><path d="M37 28Q60 32 83 28v7Q60 39 37 35Z" fill="#529FAF" /><path d="m46 20 5 2m18 0 5-2" stroke="#FFF1BB" strokeWidth="2" strokeLinecap="round" /><circle cx="60" cy="25" r="3" fill="#DF765B" /></g>;
    case "beanie":
      return <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round"><path d="M32 30Q37 8 67 10Q83 10 90 27Q62 37 32 30Z" fill="#86AFC6" /><path d="M30 29Q57 38 90 28l2 8Q60 43 29 36Z" fill="#638EA9" /><path d="M51 15q12-5 24 0" stroke="#BEDAE4" strokeWidth="2" fill="none" /><circle cx="83" cy="11" r="6" fill="#F4E1BB" /></g>;
    case "visor":
      return <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round"><path d="M31 31Q60 20 90 31l-2 8Q59 32 32 39Z" fill="#E7C46E" /><path d="M72 32Q94 30 103 38Q92 44 72 38Z" fill="#D89463" /><path d="M39 32Q61 27 77 32" stroke="#FFF0B5" strokeWidth="2" fill="none" /></g>;
    default:
      return null;
  }
}

function Glasses({ cat, view }: { cat: Cat; view: View }) {
  if (cat.glasses === "none" || view === "back" || view === "backQuarter") return null;
  if (cat.glasses === "square") {
    const offset = view === "front" ? 0 : view === "quarter" ? 10 : 26;
    return <g transform={"translate(" + offset + " 0)"} stroke={INK} strokeWidth="2.3" strokeLinejoin="round"><rect x="33" y="48" width="23" height="18" rx="4.5" fill="#F9F5E6" fillOpacity=".65" />{view !== "side" && <><rect x="64" y="48" width="23" height="18" rx="4.5" fill="#F9F5E6" fillOpacity=".65" /><path d="M56 54q4-2 8 0" fill="none" /></>}<path d="M33 53 27 51" strokeLinecap="round" /></g>;
  }
  if (cat.glasses === "shades") {
    const x = view === "front" ? 0 : view === "quarter" ? 10 : 28;
    return <g transform={"translate(" + x + " 0)"} stroke={INK} strokeWidth="2.2"><path d="M31 51h26l-3 15q-10 7-19-1Z" fill="#C47D56" />{view !== "side" && <path d="M63 51h26l-4 14q-10 8-19 1Z" fill="#C47D56" />}<path d="M55 54h10" /><path d="m37 55 8-2m25 2 8-2" stroke="#F8D89A" strokeWidth="1.7" /></g>;
  }
  const x = view === "front" ? 0 : view === "quarter" ? 9 : 27;
  return <g transform={"translate(" + x + " 0)"} stroke={INK} strokeWidth="2.3"><circle cx="43" cy="54" r="12" fill="#80B8C9" /><circle cx="76" cy="54" r="12" fill="#80B8C9" opacity={view === "side" ? 0 : 1} /><path d="M55 53h9" /><path d="m39 47 5-2m28 2 5-2" stroke="#D7F3EC" strokeWidth="2" strokeLinecap="round" /></g>;
}

function CharacterAccent({ cat, view, compact }: { cat: Cat; view: View; compact: boolean }) {
  const back = view === "back" || view === "backQuarter";
  if (cat.id === "cloud") return <path d="M49 33q-3-10 4-11 4-1 6 5 3-9 9-7 5 2 3 11" fill={cat.fur} stroke={INK} strokeWidth="2" strokeLinejoin="round" />;
  if (cat.id === "mango") return <g><path d="M62 32q-1-12 10-14 1 10-10 14Z" fill="#75A779" stroke={INK} strokeWidth="1.6" /><path d="M62 32q-5-7-1-14" stroke="#8D6F4B" strokeWidth="1.5" strokeLinecap="round" /></g>;
  if (back) return null;
  switch (cat.id) {
    case "scholar":
      return <g><path d="M18 78q9-5 16 0v16q-8-4-16 0Z" fill="#E8C994" stroke={INK} strokeWidth="1.8" /><path d="M26 78v16" stroke="#A9825A" strokeWidth="1.5" /></g>;
    case "baker":
      return <g transform={view === "side" ? "translate(5 0)" : undefined}><path d="M16 82q0-8 8-11 9-3 12 7l-2 14q-10-4-18 0Z" fill="#DDA76B" stroke={INK} strokeWidth="2" /><path d="m21 78 4 2m4-4 4 3" stroke="#F8E4B9" strokeWidth="1.7" strokeLinecap="round" /></g>;
    case "artist":
      return <g><path d="M25 80 18 63" stroke="#9D6B4D" strokeWidth={compact ? 4 : 3} strokeLinecap="round" /><path d="M17 64q-4-3-2-7l5 3Z" fill="#75A9C8" stroke={INK} strokeWidth="1.4" /></g>;
    case "mocha":
      return <g><path d="M97 74q6-2 9 3l-2 11q-5 5-12 0l-2-10q2-4 7-4Z" fill="#E8D0AE" stroke={INK} strokeWidth="1.8" /><path d="M102 77q7-1 6 5-1 4-5 3" stroke={INK} strokeWidth="1.5" /><path d="m95 70 2-4m3 5 2-4" stroke="#B99A75" strokeWidth="1.4" strokeLinecap="round" /></g>;
    case "inventor":
      return <g><path d="M24 84 18 62" stroke="#7C9CAA" strokeWidth={compact ? 4 : 3} strokeLinecap="round" /><path d="M12 59q5-5 9 1l-3 6-5-3 4-2-4-2Z" fill="#A7C3CA" stroke={INK} strokeWidth="1.5" /></g>;
    default:
      return null;
  }
}

function Markings({ cat, view }: { cat: Cat; view: View }) {
  const back = view === "back" || view === "backQuarter";
  const shift = view === "quarter" ? 7 : view === "side" ? 14 : 0;
  const base = <path d={back ? "M20 43Q30 27 49 29Q60 34 55 46Q41 49 25 62L17 56Z" : "M19 46Q23 32 41 29Q57 27 61 40Q53 49 38 49L18 57Z"} fill={cat.patch} />;
  switch (cat.id) {
    case "cloud":
      return <><path d="M23 36Q43 23 50 34Q56 42 45 45Q37 46 31 55L21 50Z" fill={cat.patch} /><path d="M75 31q13 2 21 15l-15 4q-13-8-6-19Z" fill={cat.patch} opacity=".85" /></>;
    case "calico":
      return <>{base}<path d="M78 29Q96 30 103 49L84 57Q66 52 78 29Z" fill="#DDA16D" /><path d="M32 75q8-10 16 1l-3 11-16-2Z" fill="#DDA16D" /></>;
    case "mango":
      return <><path d="M27 33Q44 22 54 34l-5 13-26 9Z" fill={cat.patch} /><path d="M72 31q17-6 26 11l-13 13-18-12Z" fill="#D7804D" /><path d="M25 64q7 5 14 0m39-4q8 4 17 0" stroke="#D7804D" strokeWidth="5" strokeLinecap="round" /></>;
    case "peach":
      return <><path d="M27 35Q44 23 54 36l-6 13-24 9Z" fill={cat.patch} /><path d="M82 36q9 1 14 12l-14 5-8-9Z" fill="#F4C4AF" /><path d="M31 71q7 4 13 0" stroke="#EAB5A2" strokeWidth="4" strokeLinecap="round" /></>;
    case "mocha":
      return <>{base}<path d="M72 32q12-5 25 9l-11 13-15-12Z" fill="#A4735E" /><path d={back ? "M43 55q16 8 34 0" : "M30 72q9 5 17 0"} stroke="#D7AC8C" strokeWidth="6" strokeLinecap="round" opacity=".7" /></>;
    case "sunny":
      return <><path d="M23 35q14-10 25 0l-3 13-23 6Z" fill={cat.patch} /><path d="M82 34q13 1 17 15l-14 6-10-13Z" fill="#F1C075" /></>;
    case "cocoa":
      return <>{base}<path d="M76 30q13 2 20 15l-12 9-12-11Z" fill="#8C6256" /></>;
    default:
      return <g transform={"translate(" + shift + " 0)"}>{base}{cat.id === "artist" || cat.id === "explorer" ? <path d="M80 30q12 1 19 15l-15 8-9-12Z" fill={cat.patch} opacity=".85" /> : null}</g>;
  }
}

function Outfit({ cat, view, path, compact }: { cat: Cat; view: View; path: string; compact: boolean }) {
  const back = view === "back" || view === "backQuarter";
  const plain = cat.id === "cloud" || cat.id === "calico" || cat.id === "peach" || cat.id === "sunny" || cat.id === "mocha";
  const dark = mix(cat.outfit, INK, .19);
  if (view === "side") {
    return <g>
      {!plain && <path d={path} fill={cat.outfit} />}
      {!plain && <path d="M83 79q8 10 4 24" stroke={mix(cat.outfit, "#FFFFFF", .43)} strokeWidth={compact ? 4 : 3} fill="none" />}
      {cat.id === "baker" && <path d="M45 80q10 5 20 5v19H47Z" fill="#FFF4DB" />}
      {cat.id === "explorer" && <path d="M48 78 77 104" stroke="#F5E0A8" strokeWidth="5" />}
      {cat.id === "mango" && <path d="M37 89q25 8 55-2" stroke="#D97D4A" strokeWidth="5" fill="none" />}
      {cat.id === "inventor" && <circle cx="82" cy="91" r="5" fill="#F5D987" />}
    </g>;
  }
  if (compact) {
    const mark = (() => {
      if (back) return cat.id === "explorer" ? <path d="M42 79 76 104" stroke="#F3D997" strokeWidth="5" /> : <path d="M60 83v20" stroke={mix(cat.outfit, "#FFFFFF", .38)} strokeWidth="3" />;
      switch (cat.id) {
        case "scholar": return <path d="M46 81v22m28-22v22" stroke="#F1DFAF" strokeWidth="4" />;
        case "baker": return <path d="M43 82q17 6 34 0v22H43Z" fill="#FFF4DB" />;
        case "explorer": return <path d="M42 78 77 105" stroke="#F5E0A8" strokeWidth="5" />;
        case "cocoa": return <path d="m60 80-5 9 5 8 5-8Z" fill="#F4D583" />;
        case "artist": return <path d="M44 82v22m32-22v22" stroke="#F1E0BA" strokeWidth="4" />;
        case "captain": return <><path d="M45 82v22m30-22v22" stroke="#F5E6B8" strokeWidth="4" /><circle cx="60" cy="93" r="3.5" fill="#FFE08C" /></>;
        case "dreamer": return <path d="M64 87q-7 4-3 10 3 4 8 0-7 1-5-10Z" fill="#F8E8AE" />;
        case "disco": return <path d="m60 84 3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" fill="#F7D584" />;
        case "mango": return <path d="M27 87q32 11 66 0m-58 10q25 7 50 0" stroke="#D97D4A" strokeWidth="5" fill="none" />;
        case "inventor": return <><path d="M43 82q17 6 34 0" stroke="#9BBBC0" strokeWidth="4" fill="none" /><circle cx="60" cy="93" r="6" fill="#F5D987" /></>;
        case "calico": return <path d="m60 81-8 5 8 4 8-4Z" fill="#D98277" />;
        case "mocha": return <path d="M41 81q19 7 38 0" stroke="#E6C099" strokeWidth="5" fill="none" />;
        case "peach": return <path d="m60 82-8 5 8 5 8-5Z" fill="#EFAFA4" />;
        case "sunny": return <circle cx="60" cy="88" r="5" fill="#F0CC72" />;
        default: return null;
      }
    })();
    return <g>{!plain && <path d={path} fill={cat.outfit} />}{mark}</g>;
  }
  return <g>
    {!plain && <><path d={path} fill={cat.outfit} /><path d={back ? "M25 79Q60 89 99 79" : "M21 80Q59 88 100 79"} stroke={dark} strokeWidth="2.2" fill="none" opacity=".65" /></>}
    {cat.id === "scholar" && (back ? <path d="M60 82v21" stroke="#E6D8A9" strokeWidth="3" /> : <><path d="M45 82v22m29-22v22" stroke="#EADBAE" strokeWidth="4" /><circle cx="60" cy="89" r="2" fill="#D9BA78" /><circle cx="60" cy="99" r="2" fill="#D9BA78" /></>)}
    {cat.id === "baker" && <><path d={back ? "M42 83v21m36-21v21" : "M39 80q21 8 42 0l-4 24H43Z"} fill="#FFF5D9" stroke="#B86D61" strokeWidth="1.7" />{!back && <path d="M59 89q5 5 0 11m0-8q-4-1-5-4m5 7q5-2 6-5" stroke="#D3A765" strokeWidth="1.6" strokeLinecap="round" fill="none" />}</>}
    {cat.id === "explorer" && <><path d={back ? "M43 79 73 105" : "M45 77 75 105"} stroke="#F4E2AD" strokeWidth="5" /><path d={back ? "M43 79 73 105" : "M45 77 75 105"} stroke="#9D6C4D" strokeWidth="1.6" /><rect x={back ? 70 : 75} y="87" width="14" height="13" rx="3" fill="#9D6C4D" stroke={INK} strokeWidth="1.5" /><circle cx={back ? 77 : 82} cy="93" r="1.5" fill="#F8D891" /></>}
    {cat.id === "cocoa" && <><path d={back ? "M43 79q17 8 34 0" : "M43 78q17 8 34 0"} stroke="#F3D685" strokeWidth="5" fill="none" />{!back && <path d="m60 82-5 9 5 10 5-10Z" fill="#E8C46D" stroke={INK} strokeWidth="1.6" />}</>}
    {cat.id === "artist" && <><path d="M43 80v24m34-24v24" stroke="#F2DFB8" strokeWidth="4" />{!back && <><path d="M53 91h18v13H53Z" fill="#8FA4CC" stroke="#506C9B" strokeWidth="1.6" /><circle cx="61" cy="95" r="2" fill="#F7C864" /><circle cx="67" cy="98" r="1.7" fill="#E98270" /></>}</>}
    {cat.id === "captain" && (back ? <><path d="M60 81v24" stroke="#E9E4C4" strokeWidth="3" /><path d="M48 84q12 6 24 0" stroke="#E9E4C4" strokeWidth="2" fill="none" /></> : <><path d="M44 80v25m32-25v25" stroke="#E9E4C4" strokeWidth="4" /><path d="M49 83q11 8 22 0" stroke="#E9E4C4" strokeWidth="2" fill="none" /><circle cx="60" cy="91" r="2.6" fill="#F7D478" /><circle cx="60" cy="100" r="2.6" fill="#F7D478" /></>)}
    {cat.id === "dreamer" && <><path d="M40 81q20 8 41 0" stroke="#EAD3DC" strokeWidth="4" fill="none" />{!back && <path d="M64 88q-8 4-4 11 4 5 9 0-8 2-5-11Z" fill="#F7E9B6" />}</>}
    {cat.id === "disco" && <><path d="M40 84q20 8 41 0" stroke="#D9A064" strokeWidth="5" fill="none" />{!back && <path d="m61 86 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z" fill="#F4D17C" stroke={INK} strokeWidth="1.2" />}</>}
    {cat.id === "mango" && <><path d="M26 86q34 11 69 0m-62 10q28 8 55-1" stroke="#D77E4D" strokeWidth="4" strokeLinecap="round" fill="none" /></>}
    {cat.id === "inventor" && <><path d="M40 81q20 9 40 0" stroke="#A2BFC3" strokeWidth="4" fill="none" />{!back && <><path d="M51 87h20v17H51Z" fill="#85AEB8" stroke="#5D858E" strokeWidth="1.6" /><circle cx="61" cy="95" r="4" fill="none" stroke="#F9DE9A" strokeWidth="2" /><circle cx="61" cy="95" r="1.5" fill="#F9DE9A" /></>}</>}
    {cat.id === "calico" && !back && <><path d="M52 78q8 8 16 0" stroke="#D78478" strokeWidth="3.5" fill="none" /><path d="m60 82-7 3 7 4 7-4Z" fill="#D78478" stroke={INK} strokeWidth="1.3" /></>}
    {cat.id === "mocha" && !back && <><path d="M40 80q20 8 41 0" stroke="#D8B497" strokeWidth="4" fill="none" /><circle cx="60" cy="86" r="3" fill="#E6C78D" /></>}
    {cat.id === "peach" && !back && <><path d="M46 83q14 5 28 0" stroke="#EBAEA0" strokeWidth="3" fill="none" /><path d="m60 84-7 4 7 3 7-3Z" fill="#F2BCAD" stroke="#C88982" strokeWidth="1.2" /><circle cx="60" cy="87" r="2" fill="#F8E8BC" /></>}
    {cat.id === "sunny" && !back && <><path d="M43 81q17 7 34 0" stroke="#E2BA74" strokeWidth="3.5" fill="none" /><circle cx="60" cy="87" r="4" fill="#F4CE73" stroke="#B88458" strokeWidth="1.5" /></>}
  </g>;
}

function Face({ mood, view, blink, compact }: { mood: DrawGuessCatMood; view: View; blink: boolean; compact: boolean }) {
  if (view === "back") return null;
  if (view === "backQuarter") return <g><path d="M96 64q4 2 6 0" stroke={INK} strokeWidth="2" strokeLinecap="round" /><ellipse cx="95" cy="57" rx="2" ry={blink ? 1 : 3} fill={INK} /></g>;
  const quarter = view === "quarter";
  const side = view === "side";
  const left = side ? 79 : quarter ? 57 : 44;
  const right = quarter ? 85 : 76;
  const nose = side ? 103 : quarter ? 72 : 60;
  return <g>
    {!compact && !side && <><ellipse cx={quarter ? 55 : 42} cy="72" rx="6" ry="3.5" fill={BLUSH} opacity=".48" /><ellipse cx={quarter ? 91 : 82} cy="72" rx="6" ry="3.5" fill={BLUSH} opacity=".48" /></>}
    {!compact && side && <ellipse cx="86" cy="72" rx="7" ry="3.5" fill={BLUSH} opacity=".5" />}
    {mood === "happy" ? <path d={side ? "M74 55q5-6 10 0" : "M" + (left - 5) + " 55q5-6 10 0 M" + (right - 5) + " 55q5-6 10 0"} stroke={INK} strokeWidth="2.7" strokeLinecap="round" /> :
      mood === "sad" ? <path d={side ? "M74 54l10 4" : "M" + (left - 5) + " 54l10 4 M" + (right - 5) + " 58l10-4"} stroke={INK} strokeWidth="2.7" strokeLinecap="round" /> :
        <><ellipse cx={left} cy="55" rx="2.5" ry={blink ? .8 : 3.5} fill={INK} />{!side && <ellipse cx={right} cy="55" rx="2.5" ry={blink ? .8 : 3.5} fill={INK} />}</>}
    <path d={side ? "m100 64 6 2-6 2Z" : "m" + (nose - 5) + " 66 5 3 5-3Z"} fill="#B87972" />
    {side ? <path d={mood === "sad" ? "M92 77q6-4 10 0" : "M92 73q7 7 11 0"} stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" /> :
      mood === "happy" ? <path d={"M" + nose + " 70q-10 14-18 0m18 0q10 14 18 0"} stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" /> :
        mood === "sad" ? <path d={"M" + (nose - 8) + " 77q8-7 16 0"} stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" /> :
          <path d={"M" + nose + " 69v4m0 0q-5 4-9 0m9 0q5 4 9 0"} stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" />}
    {mood === "sad" && <path d={side ? "M86 63q-3 5-1 7 3 1 3-2Z" : "M" + (right + 3) + " 63q-3 5-1 7 3 1 3-2Z"} fill="#89C7DD" />}
    {!compact && !side && <path d={quarter ? "m46 68-9-2m10 5-8 1m53-4 8-3m-8 6 9 1" : "m35 67-8-2m9 6-8 1m57-5 8-2m-9 6 8 1"} stroke={SOFT_INK} strokeWidth="1.3" strokeLinecap="round" opacity=".75" />}
  </g>;
}

function TinyCat({ cat, className, frame, id, mood, size, title }: {
  cat: Cat;
  className: string;
  frame: number;
  id: string;
  mood: DrawGuessCatMood;
  size: number;
  title?: string;
}) {
  const head = "M13 62Q13 37 35 29Q59 20 83 29Q107 38 107 63V78Q107 101 60 103Q13 101 13 78Z";
  return <span className={"inline-grid shrink-0 place-items-center " + className} style={{ width: size, height: size }} title={title} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} data-cat={cat.id} data-detail="tiny" data-frame={frame} data-mood={mood}>
    <svg viewBox="0 0 120 108" width="100%" height="100%" fill="none" aria-hidden="true">
      <defs><clipPath id={id}><path d={head} /></clipPath></defs>
      <path d={tailFor(cat, "front")} fill={cat.patch} stroke={INK} strokeWidth="3.8" strokeLinejoin="round" />
      <path d={earsFor(cat, "front")} fill={cat.fur} stroke={INK} strokeWidth="4.2" strokeLinejoin="round" />
      <path d={head} fill={cat.fur} stroke={INK} strokeWidth="4.2" />
      <g clipPath={"url(#" + id + ")"}><Markings cat={cat} view="front" /><Outfit cat={cat} view="front" path={SHAPES.front.clothes} compact /></g>
      <Face mood={mood} view="front" blink={false} compact />
      <Glasses cat={cat} view="front" />
      <Hat cat={cat} back={false} side={false} />
      <CharacterAccent cat={cat} view="front" compact />
      {cat.id === "peach" && <path d="m88 35 9-5-2 10-7-3-8 3v-9Z" fill="#E8A99B" stroke={INK} strokeWidth="2" />}
    </svg>
  </span>;
}

export function DrawGuessCatSprite({ animated = false, catId, className = "", direction = "S", frame, mood = "idle", performance = "default", size = 72, title }: {
  animated?: boolean;
  catId?: string | null;
  className?: string;
  direction?: DrawGuessCatDirection;
  frame?: number;
  mood?: DrawGuessCatMood;
  performance?: DrawGuessCatPerformance;
  size?: number;
  title?: string;
}) {
  const cat = getDrawGuessCat(catId);
  const uniqueId = useId().replaceAll(":", "");
  const [animatedFrame, setAnimatedFrame] = useState(0);
  useEffect(() => {
    if (!animated || frame !== undefined) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    const syncMotion = () => {
      if (timer !== undefined) window.clearInterval(timer);
      if (reducedMotion.matches) {
        setAnimatedFrame(0);
        return;
      }
      timer = window.setInterval(() => setAnimatedFrame((current) => (current + 1) % DRAW_GUESS_CAT_FRAME_COUNT), mood === "happy" ? 70 : mood === "sad" ? 110 : 90);
    };
    syncMotion();
    reducedMotion.addEventListener("change", syncMotion);
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      reducedMotion.removeEventListener("change", syncMotion);
    };
  }, [animated, frame, mood]);

  const current = frame !== undefined && Number.isFinite(frame) ? Math.trunc(frame) : animatedFrame;
  const activeFrame = ((current % DRAW_GUESS_CAT_FRAME_COUNT) + DRAW_GUESS_CAT_FRAME_COUNT) % DRAW_GUESS_CAT_FRAME_COUNT;
  if (size <= 36) return <TinyCat cat={cat} className={className} frame={activeFrame} id={uniqueId + "-tiny"} mood={mood} size={size} title={title} />;
  const view: View = direction === "S" ? "front" : direction === "SE" || direction === "SW" ? "quarter" : direction === "E" || direction === "W" ? "side" : direction === "NE" || direction === "NW" ? "backQuarter" : "back";
  const mirror = direction === "SW" || direction === "W" || direction === "NW";
  const back = view === "back" || view === "backQuarter";
  const shape = SHAPES[view];
  const compact = size <= 72;
  const motion = motionAt(mood, activeFrame, performance);
  const blink = mood === "idle" && activeFrame === 10;
  const furLight = mix(cat.fur, "#FFFFFF", .16);
  const furDark = mix(cat.fur, "#705746", .18);
  const faceX = view === "front" ? 60 : view === "quarter" ? 73 : 88;
  const clipId = uniqueId + "-clip";
  const gradientId = uniqueId + "-fur";
  const earPath = earsFor(cat, view);
  const tailPath = tailFor(cat, view);
  const poseTransform = "translate(0 " + motion.y + ") rotate(" + motion.tilt + " 60 69) translate(60 69) scale(" + motion.scaleX + " " + motion.scaleY + ") translate(-60 -69)";
  return <span className={"inline-grid shrink-0 place-items-center " + className} style={{ width: size, height: size }} title={title} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} data-cat={cat.id} data-detail={compact ? "compact" : "full"} data-direction={direction} data-view={view} data-frame={activeFrame} data-mood={mood} data-performance={performance}>
    <svg viewBox="0 0 120 116" width="100%" height="100%" fill="none" aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="26" y1="30" x2="100" y2="102" gradientUnits="userSpaceOnUse"><stop stopColor={furLight} /><stop offset=".62" stopColor={cat.fur} /><stop offset="1" stopColor={furDark} /></linearGradient>
        <clipPath id={clipId}><path d={shape.body} /></clipPath>
      </defs>
      <ellipse cx="60" cy="108" rx={mood === "happy" && motion.y < -7 ? 26 : 32} ry="4.5" fill="#55443A" opacity={mood === "happy" && motion.y < -7 ? .09 : .14} />
      <g transform={mirror ? "translate(120 0) scale(-1 1)" : undefined}>
        <g transform={poseTransform}>
          <g transform={"translate(0 " + motion.tailY + ")"}><path d={tailPath} fill={cat.patch} stroke={INK} strokeWidth={compact ? 3.2 : 2.8} strokeLinecap="round" strokeLinejoin="round" /></g>
          {(view === "quarter" || view === "side" || view === "backQuarter") && <g><ellipse cx={view === "side" ? 37 : 29} cy="86" rx="8.5" ry="6.5" fill={furDark} stroke={INK} strokeWidth="2.2" /><ellipse cx={view === "side" ? 48 : 45} cy="101" rx="8" ry="4.5" fill={furDark} stroke={INK} strokeWidth="2" /></g>}
          <g transform={mood === "sad" ? "translate(0 4) scale(1 .9)" : undefined}>
            <path d={earPath} fill={cat.fur} stroke={INK} strokeWidth={compact ? 3.2 : 2.8} strokeLinejoin="round" />
            {!compact && shape.innerEar && <path d={shape.innerEar} fill="#DDA391" />}
          </g>
          <path d={shape.body} fill={compact ? cat.fur : "url(#" + gradientId + ")"} stroke={INK} strokeWidth={compact ? 3.2 : 2.8} strokeLinejoin="round" />
          <g clipPath={"url(#" + clipId + ")"}>
            <Markings cat={cat} view={view} />
            {!compact && !back && <><path d={view === "side" ? "M83 60q18-4 23 10l-10 10q-15 1-20-10Z" : "M41 69q3-9 13-11 6-1 10 4 7-6 15-3 8 4 7 12l-5 11H39Z"} fill={mix(cat.fur, "#FFF7DF", .29)} opacity=".88" /><path d={view === "side" ? "M86 75q8 5 18 0" : "M43 76q18 5 36 0"} stroke="#FFFFFF" strokeOpacity=".28" strokeWidth="1.6" fill="none" /></>}
            {back && <><path d="M43 42q17 7 34 0m-31 9q14 6 28 0" stroke={mix(cat.patch, cat.fur, .38)} strokeWidth={compact ? 5 : 4} strokeLinecap="round" opacity=".75" /><path d="M59 81v22" stroke={INK} strokeWidth="1.5" opacity=".3" /></>}
            <Outfit cat={cat} view={view} path={shape.clothes} compact={compact} />
            {!compact && <path d={view === "side" ? "M45 45q-6 17-2 32" : "M28 54q-5 15 0 25"} stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" opacity=".22" />}
          </g>
          <Face mood={mood} view={view} blink={blink} compact={compact} />
          <Glasses cat={cat} view={view} />
          <Hat cat={cat} back={back} side={view === "side"} />
          <CharacterAccent cat={cat} view={view} compact={compact} />
          {(view === "front" || view === "back") && <ellipse cx={27 + motion.handsIn} cy={86 - motion.leftLift} rx="8.5" ry="7" fill={cat.fur} stroke={INK} strokeWidth="2.4" />}
          <ellipse cx={(view === "front" || view === "back" ? 93 : 94) - motion.handsIn + motion.rightOut} cy={86 - motion.rightLift} rx={view === "side" ? 9.5 : 8.5} ry="7" fill={cat.fur} stroke={INK} strokeWidth="2.4" />
          {view !== "side" && view !== "backQuarter" && <ellipse cx={43 + motion.footStep} cy="102" rx="11" ry="5" fill={furDark} stroke={INK} strokeWidth="2.3" />}
          <ellipse cx={(view === "front" || view === "back" ? 78 : 80) - motion.footStep} cy="102" rx={view === "side" ? 12 : 11} ry="5" fill={furDark} stroke={INK} strokeWidth="2.3" />
          {!compact && view !== "side" && view !== "backQuarter" && <path d={"M" + (38 + motion.footStep) + " 101q5-2 10 0M" + (73 - motion.footStep) + " 101q5-2 10 0"} stroke={furLight} strokeWidth="1.6" strokeLinecap="round" />}
          {mood === "happy" && activeFrame >= 4 && activeFrame <= 7 && <path d="m13 45 3-5m-3 11-5-1m99-5 3-5m-3 11 5-1" stroke="#E8B954" strokeWidth="2.3" strokeLinecap="round" />}
          {cat.id === "peach" && !back && <g><path d="m87 34 8-4-1 9-7-3-7 3v-8Z" fill="#E6A695" stroke={INK} strokeWidth="1.4" /><circle cx="87" cy="35" r="2.2" fill="#F7E3B8" /></g>}
          {cat.id === "sunny" && !back && <circle cx={faceX + 22} cy="43" r="3" fill="#F5D37C" stroke={INK} strokeWidth="1" />}
          {cat.id === "inventor" && !back && <path d="M42 28q18-6 36 0" stroke="#D6E0D2" strokeWidth="2" strokeLinecap="round" />}
        </g>
      </g>
    </svg>
  </span>;
}

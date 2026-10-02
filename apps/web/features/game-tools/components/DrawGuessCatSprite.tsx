"use client";

import { useEffect, useId, useState } from "react";
import { getDrawGuessCat, type DrawGuessCatDirection, type DrawGuessCatId, type DrawGuessCatMood } from "@/features/game-tools/drawGuessCats";

type Cat = ReturnType<typeof getDrawGuessCat>;
type View = "front" | "quarter" | "side" | "backQuarter" | "back";
type EarStyle = "pointed" | "round" | "folded" | "tall" | "tufted";
type TailStyle = "curl" | "fluffy" | "straight" | "short";
export type DrawGuessCatPerformance = "default" | "champion" | "clap" | "wave";
export type DrawGuessCatActivity = "none" | "drawing" | "thinking";

const INK = "#57463F";
const SOFT_INK = "#8E7062";
const BLUSH = "#EAAE98";
export const DRAW_GUESS_CAT_FRAME_COUNT = 12;
const DRAW_GUESS_ACTIVITY_FRAME_COUNT = 18;

// One loop has a poised beat, a continuous stroke, a lifted pencil, then a quiet reset.
const DRAWING_POSES = [
  { x: 101, y: 92, ink: 0, fade: 0 },
  { x: 101, y: 92, ink: 0, fade: 0 },
  { x: 100, y: 96, ink: 0, fade: 0 },
  { x: 100, y: 100, ink: 0, fade: 0 },
  { x: 102, y: 98, ink: 14, fade: 1 },
  { x: 104, y: 99, ink: 28, fade: 1 },
  { x: 105, y: 96, ink: 42, fade: 1 },
  { x: 107, y: 97, ink: 56, fade: 1 },
  { x: 109, y: 99, ink: 70, fade: 1 },
  { x: 110, y: 97, ink: 83, fade: 1 },
  { x: 108, y: 100, ink: 94, fade: 1 },
  { x: 110, y: 99, ink: 100, fade: 1 },
  { x: 110, y: 95, ink: 100, fade: 1 },
  { x: 109, y: 92, ink: 100, fade: 1 },
  { x: 107, y: 91, ink: 100, fade: .75 },
  { x: 104, y: 91, ink: 100, fade: .5 },
  { x: 102, y: 91, ink: 100, fade: .25 },
  { x: 101, y: 92, ink: 100, fade: 0 },
] as const;

const THINKING_POSES = [
  { x: 93, y: 86, gaze: 0, bubble: 0 },
  { x: 92, y: 85, gaze: 0, bubble: 0 },
  { x: 90, y: 82, gaze: 1, bubble: 0 },
  { x: 87, y: 78, gaze: 1, bubble: 1 },
  { x: 83, y: 75, gaze: 2, bubble: 1 },
  { x: 80, y: 73, gaze: 2, bubble: 2 },
  { x: 79, y: 73, gaze: 2, bubble: 2 },
  { x: 79, y: 73, gaze: 2, bubble: 3 },
  { x: 78, y: 72, gaze: 2, bubble: 3 },
  { x: 78, y: 72, gaze: 2, bubble: 3 },
  { x: 78, y: 72, gaze: 2, bubble: 3 },
  { x: 80, y: 74, gaze: 2, bubble: 3 },
  { x: 82, y: 76, gaze: 2, bubble: 3 },
  { x: 84, y: 78, gaze: 1, bubble: 2 },
  { x: 87, y: 81, gaze: 1, bubble: 2 },
  { x: 90, y: 84, gaze: 0, bubble: 1 },
  { x: 92, y: 85, gaze: 0, bubble: 1 },
  { x: 93, y: 86, gaze: 0, bubble: 0 },
] as const;

const ACTIVITY_BODY_FRAMES = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 9, 10, 11, 11] as const;

const SHAPES: Record<View, { body: string; ears: string; innerEar: string; clothes: string }> = {
  front: {
    body: "M19 61C19 43 30 32 45 30Q60 25 76 30C92 33 101 45 101 62V76C101 94 84 104 60 104S19 94 19 76Z",
    ears: "M29 43 25 17Q25 12 30 14L47 32ZM73 32 90 14Q95 12 95 17L91 44Z",
    innerEar: "M32 30 30 20 40 32ZM80 32 90 20 88 31Z",
    clothes: "M20 78Q59 86 100 78V96Q84 106 59 106Q35 106 20 96Z",
  },
  quarter: {
    body: "M24 63C25 43 39 32 57 30Q79 27 91 39Q99 47 100 57Q105 60 105 66Q105 72 99 75V80C98 96 84 104 62 104Q25 104 24 79Z",
    ears: "M36 43 33 17Q33 12 38 14L53 33ZM79 34 94 17Q99 13 100 20L96 45Z",
    innerEar: "M40 32 38 22 47 33ZM86 33 95 24 94 36Z",
    clothes: "M28 80Q55 88 101 79V96Q86 106 62 106Q40 106 28 97Z",
  },
  side: {
    body: "M32 65C32 49 43 37 58 32Q70 27 81 32Q94 37 98 50Q101 56 99 60Q104 63 104 67Q104 71 98 74L96 79Q95 94 81 101Q69 107 55 103Q33 98 32 80Z",
    ears: "M47 42 45 21Q45 16 50 18L65 34ZM74 35 82 16Q85 12 90 17L93 43Z",
    innerEar: "M78 33 86 22 88 35Z",
    clothes: "M34 79Q58 87 96 78L94 91Q86 105 69 105Q43 104 36 92Z",
  },
  backQuarter: {
    body: "M25 61C27 42 42 32 59 29Q81 27 93 40Q102 51 104 65V78Q102 96 84 103Q62 109 39 99Q24 91 25 75Z",
    ears: "M36 43 33 17Q33 12 38 14L54 33ZM78 34 92 16Q97 13 99 20L96 45Z",
    innerEar: "",
    clothes: "M26 79Q57 89 103 78V97Q85 108 61 107Q37 106 26 97Z",
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

// Tiny differences in timing and gesture keep a room of cats from moving in lockstep.
const PERSONALITY: Record<DrawGuessCatId, { phase: number; sway: number; tail: number; paw: "left" | "right" | "none"; ear: number }> = {
  scholar: { phase: 0, sway: .65, tail: .55, paw: "left", ear: .7 },
  baker: { phase: 3, sway: .85, tail: .8, paw: "right", ear: .5 },
  explorer: { phase: 6, sway: 1.2, tail: 1.2, paw: "right", ear: 1.1 },
  cocoa: { phase: 9, sway: .5, tail: .45, paw: "none", ear: .7 },
  cloud: { phase: 2, sway: 1.1, tail: 1.1, paw: "left", ear: 1.2 },
  artist: { phase: 5, sway: .9, tail: .85, paw: "right", ear: .8 },
  captain: { phase: 8, sway: .75, tail: .7, paw: "left", ear: .7 },
  dreamer: { phase: 11, sway: .4, tail: .35, paw: "none", ear: .4 },
  disco: { phase: 4, sway: 1.3, tail: 1.25, paw: "right", ear: 1.1 },
  sunny: { phase: 7, sway: 1.05, tail: 1, paw: "left", ear: 1 },
  calico: { phase: 10, sway: .8, tail: 1.15, paw: "right", ear: .9 },
  mocha: { phase: 1, sway: .55, tail: .5, paw: "none", ear: .6 },
  mango: { phase: 6, sway: 1.2, tail: 1.3, paw: "left", ear: 1.2 },
  peach: { phase: 9, sway: .8, tail: .95, paw: "right", ear: .8 },
  inventor: { phase: 3, sway: 1, tail: .9, paw: "left", ear: 1.15 },
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

function motionAt(cat: Cat, mood: DrawGuessCatMood, frame: number, performance: DrawGuessCatPerformance) {
  const personality = PERSONALITY[cat.id];
  const idleY = [0, 0, -.5, -1.5, -2, -1.8, -1, 0, .5, .3, 0, 0];
  const happyY = [0, 1.5, 3.5, -2, -8, -13, -13, -9, -3, 2.5, -2, 0];
  const happyTilt = [0, -1, -2, 2, 4, 3, 0, -3, -2, 1, 1, 0];
  const happySquash = [1, .96, .88, 1.08, 1.06, 1.02, 1.02, 1.04, .98, .9, 1.04, 1];
  const happyArms = [0, 0, 2, 6, 10, 13, 13, 9, 4, 0, 2, 0];
  const sadY = [0, .5, 1.5, 2.5, 3.5, 4, 4, 3.5, 2.5, 1.5, .5, 0];
  const sadTilt = [0, -.5, -1, -2, -3, -4, -4, -3.5, -2.5, -1.5, -.5, 0];
  if (mood === "idle") {
    const pawBeat = [0, 0, 0, 0, 0, 1, 3, 4, 2, 0, 0, 0][frame];
    const waveBeat = performance === "wave" ? [0, 0, 2, 5, 9, 13, 11, 7, 3, 0, 0, 0][frame] : 0;
    return {
      y: idleY[frame] * personality.sway, tilt: [0, 0, .4, .7, 1, .6, 0, -.6, -1, -.4, 0, 0][frame] * personality.sway,
      scaleX: [1, 1, .998, .991, .987, .99, .997, 1, 1.01, 1.006, 1, 1][frame],
      scaleY: [1, 1, 1.005, 1.018, 1.028, 1.022, 1.01, 1, .99, .995, 1, 1][frame],
      leftLift: personality.paw === "left" ? pawBeat : 0,
      rightLift: Math.max(personality.paw === "right" ? pawBeat : 0, waveBeat),
      handsIn: 0, rightOut: waveBeat > 0 ? waveBeat * .35 : 0,
      footStep: [0, 0, .5, 1, 1, .5, 0, -.5, -1, -.5, 0, 0][frame] * personality.sway,
      tailY: [0, 0, -1, -2, -2, -1, 0, 1, 2, 1, 0, 0][frame] * personality.tail,
      tailAngle: [0, 1, 3, 5, 6, 4, 0, -3, -5, -2, 0, 0][frame] * personality.tail,
      earTilt: [0, 0, 0, 1, 2, 0, 0, -1, -2, 0, 0, 0][frame] * personality.ear,
      gaze: [0, 0, 0, 0, 0, .5, 1, 1, .5, 0, 0, 0][frame],
    };
  }
  if (mood === "sad") {
    return {
      y: sadY[frame], tilt: sadTilt[frame],
      scaleX: [1, 1, 1.01, 1.02, 1.03, 1.04, 1.04, 1.03, 1.02, 1.01, 1, 1][frame],
      scaleY: [1, .99, .97, .95, .93, .92, .92, .93, .95, .97, .99, 1][frame],
      leftLift: [0, 0, -1, -2, -3, -3, -3, -2, -1, 0, 0, 0][frame],
      rightLift: [0, 0, -1, -2, -3, -3, -3, -2, -1, 0, 0, 0][frame],
      handsIn: 0, rightOut: 0, footStep: 0,
      tailY: [0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0][frame],
      tailAngle: [0, -1, -3, -5, -6, -6, -6, -4, -2, -1, 0, 0][frame],
      earTilt: [0, 0, -1, -2, -3, -4, -4, -3, -2, -1, 0, 0][frame], gaze: 0,
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
    tailAngle: [0, 2, 5, 9, 11, 8, 3, -6, -9, -3, 1, 0][frame] * personality.tail,
    earTilt: [0, -1, -2, 2, 4, 3, 1, -2, -3, 1, 0, 0][frame] * personality.ear,
    gaze: 0,
  };
}

function mix(a: string, b: string, amount: number) {
  const read = (hex: string, index: number) => parseInt(hex.slice(index, index + 2), 16);
  const channel = (index: number) => Math.round(read(a, index) * (1 - amount) + read(b, index) * amount).toString(16).padStart(2, "0");
  return "#" + channel(1) + channel(3) + channel(5);
}

function Hat({ cat, view }: { cat: Cat; view: View }) {
  const profile = view === "side";
  const threeQuarter = view === "quarter" || view === "backQuarter";
  const back = view === "back" || view === "backQuarter";
  switch (cat.hat) {
    case "cap":
      return <g stroke={INK} strokeLinejoin="round" strokeWidth="2.4">
        <path d={profile ? "M48 32Q53 12 72 11Q88 10 95 27L94 34Q70 39 48 32Z" : threeQuarter ? "M38 30Q43 12 63 10Q83 8 96 27L94 33Q66 39 38 30Z" : "M34 30Q37 13 53 10Q75 5 88 25L86 31Q62 38 34 30Z"} fill={cat.id === "explorer" ? "#68A6C8" : "#728CB3"} />
        <path d={profile ? "M49 31Q71 37 96 29L98 34Q74 41 48 36Z" : threeQuarter ? "M38 30Q69 37 96 29L97 34Q66 42 37 35Z" : "M34 29Q61 36 89 27L91 32Q63 41 33 34Z"} fill={cat.id === "explorer" ? "#397FA7" : "#536D99"} />
        {!back && <path d={profile ? "M83 34Q104 31 112 37Q102 42 86 39Z" : threeQuarter ? "M75 34Q96 31 106 37Q94 43 77 39Z" : "M70 34Q88 31 97 36Q84 43 65 39Z"} fill="#426F98" />}
        <circle cx={profile ? 73 : threeQuarter ? 67 : 60} cy="12" r="2.2" fill="#F7DC92" stroke="none" />
        {cat.id === "scholar" && <path d={profile ? "M66 23h16" : threeQuarter ? "M56 22h17" : "M51 22h17"} stroke="#EEDC9E" strokeWidth="2" strokeLinecap="round" />}
      </g>;
    case "beret":
      return <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round"><path d={profile ? "M48 30Q52 14 73 12Q90 10 100 24Q92 35 68 36Q53 35 48 30Z" : threeQuarter ? "M38 29Q41 13 63 11Q83 9 97 24Q88 35 60 35Q46 34 38 29Z" : "M32 28Q34 12 58 12Q81 9 91 22Q80 33 54 33Q40 33 32 28Z"} fill="#D77F72" /><path d={profile ? "M52 33Q73 39 96 27" : threeQuarter ? "M42 31Q67 38 93 27" : "M37 30Q61 36 87 26"} stroke="#AF5F59" fill="none" /><path d={profile ? "m70 14 2-8" : threeQuarter ? "m62 13 2-8" : "m57 14 2-8"} strokeLinecap="round" /><path d={profile ? "M61 21q11-6 23-3" : threeQuarter ? "M53 19q11-5 23-2" : "M47 19q10-5 21-2"} stroke="#F8B6A2" strokeWidth="2" fill="none" strokeLinecap="round" /></g>;
    case "crown":
      return <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round"><path d={profile ? "M56 30 55 14 66 21 77 8 86 21 96 15 94 32Z" : threeQuarter ? "M39 29 36 10 50 19 65 5 78 19 94 10 93 31Z" : "m36 28-3-20 14 10L60 5l13 13L87 8l-3 20Z"} fill="#F3CB68" /><path d={profile ? "M56 30Q75 35 94 30v7Q75 41 56 36Z" : threeQuarter ? "M39 29Q67 35 93 30v7Q65 42 39 36Z" : "M37 28Q60 32 83 28v7Q60 39 37 35Z"} fill="#529FAF" /><path d={profile ? "m65 23 5 2m15 0 4-2" : threeQuarter ? "m49 21 5 2m22 0 5-2" : "m46 20 5 2m18 0 5-2"} stroke="#FFF1BB" strokeWidth="2" strokeLinecap="round" /><circle cx={profile ? 77 : threeQuarter ? 66 : 60} cy="26" r="3" fill="#DF765B" /></g>;
    case "beanie":
      return <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round"><path d={profile ? "M47 31Q51 11 76 10Q91 10 97 29Q76 37 47 31Z" : threeQuarter ? "M37 30Q42 9 70 10Q88 10 96 28Q70 38 37 30Z" : "M32 30Q37 8 67 10Q83 10 90 27Q62 37 32 30Z"} fill="#86AFC6" /><path d={profile ? "M47 30Q71 39 97 29l2 8Q72 44 47 37Z" : threeQuarter ? "M37 29Q66 39 96 28l2 8Q66 44 36 36Z" : "M30 29Q57 38 90 28l2 8Q60 43 29 36Z"} fill="#638EA9" /><path d={profile ? "M65 16q11-4 22 0" : threeQuarter ? "M57 15q12-5 24 0" : "M51 15q12-5 24 0"} stroke="#BEDAE4" strokeWidth="2" fill="none" /><circle cx={profile ? 92 : threeQuarter ? 89 : 83} cy="11" r="6" fill="#F4E1BB" /></g>;
    case "visor":
      return <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round"><path d={profile ? "M48 32Q72 24 96 31l-2 8Q69 35 48 39Z" : threeQuarter ? "M39 31Q68 22 97 31l-2 8Q66 34 39 39Z" : "M31 31Q60 20 90 31l-2 8Q59 32 32 39Z"} fill="#E7C46E" />{!back && <path d={profile ? "M83 34Q105 30 113 38Q102 45 84 39Z" : threeQuarter ? "M77 33Q98 30 108 38Q96 45 76 39Z" : "M72 32Q94 30 103 38Q92 44 72 38Z"} fill="#D89463" />}<path d={profile ? "M57 32Q75 28 89 32" : threeQuarter ? "M48 32Q68 27 86 32" : "M39 32Q61 27 77 32"} stroke="#FFF0B5" strokeWidth="2" fill="none" /></g>;
    default:
      return null;
  }
}

function Glasses({ cat, view }: { cat: Cat; view: View }) {
  if (cat.glasses === "none") return null;
  if (view === "back") return cat.glasses === "goggles"
    ? <g><path d="M29 51Q59 57 91 51v7Q59 64 29 58Z" fill="#76A7B2" stroke={INK} strokeWidth="2" /><path d="M38 54q21 5 44 0" stroke="#D6ECE8" strokeWidth="1.5" fill="none" /></g>
    : <g><path d="M29 53Q60 59 91 53" stroke={INK} strokeWidth="2.4" fill="none" /><path d="M29 52v7m62-7v7" stroke={INK} strokeWidth="2.2" strokeLinecap="round" /></g>;
  if (view === "backQuarter") {
    return <g stroke={INK} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M63 50Q81 48 94 52" fill="none" />
      {cat.glasses === "square" ? <path d="M93 51q8-2 11 2l-1 12q-4 3-9-1Z" fill="#F9F5E6" fillOpacity=".65" /> : cat.glasses === "shades" ? <path d="M93 51q9-2 12 2l-3 12q-5 4-9-1Z" fill="#C47D56" /> : <ellipse cx="98" cy="57" rx="6" ry="10" fill="#80B8C9" />}
      <path d="M62 50q-4 0-5 3" fill="none" />
    </g>;
  }
  if (view === "side") {
    return <g stroke={INK} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
      <path d="M53 51Q66 47 79 52" fill="none" />
      {cat.glasses === "square" ? <><path d="M78 50q10-3 18 1l-1 14q-7 5-16-1Z" fill="#F9F5E6" fillOpacity=".65" /><path d="M96 53 102 55" /></> : cat.glasses === "shades" ? <><path d="M78 50q12-3 19 1l-3 14q-8 6-16-1Z" fill="#C47D56" /><path d="M84 54q5-2 9-1" stroke="#F8D89A" strokeWidth="1.7" /></> : <><ellipse cx="87" cy="57" rx="10" ry="11" fill="#80B8C9" /><path d="m83 51 6-2" stroke="#D7F3EC" strokeWidth="2" /></>}
    </g>;
  }
  if (cat.glasses === "square") {
    return view === "quarter" ? <g stroke={INK} strokeWidth="2.3" strokeLinejoin="round"><path d="M46 52 39 50" strokeLinecap="round" /><rect x="48" y="48" width="22" height="18" rx="4.5" fill="#F9F5E6" fillOpacity=".65" /><path d="M70 54q4-3 8 0" fill="none" /><path d="M78 50q8-3 15 1l-1 13q-6 4-13 0Z" fill="#F9F5E6" fillOpacity=".65" /></g> : <g stroke={INK} strokeWidth="2.3" strokeLinejoin="round"><rect x="33" y="48" width="23" height="18" rx="4.5" fill="#F9F5E6" fillOpacity=".65" /><rect x="64" y="48" width="23" height="18" rx="4.5" fill="#F9F5E6" fillOpacity=".65" /><path d="M56 54q4-2 8 0M33 53 27 51" fill="none" strokeLinecap="round" /></g>;
  }
  if (cat.glasses === "shades") {
    return view === "quarter" ? <g stroke={INK} strokeWidth="2.2"><path d="M47 50h25l-3 15q-10 7-19-1ZM78 51q9-3 16 0l-3 13q-6 6-13 0Z" fill="#C47D56" /><path d="M71 54h7m-23 1 8-2m20 2 6-2" stroke="#F8D89A" strokeWidth="1.7" /></g> : <g stroke={INK} strokeWidth="2.2"><path d="M31 51h26l-3 15q-10 7-19-1ZM63 51h26l-4 14q-10 8-19 1Z" fill="#C47D56" /><path d="M55 54h10" /><path d="m37 55 8-2m25 2 8-2" stroke="#F8D89A" strokeWidth="1.7" /></g>;
  }
  return view === "quarter" ? <g stroke={INK} strokeWidth="2.3"><ellipse cx="60" cy="55" rx="12" ry="12" fill="#80B8C9" /><ellipse cx="86" cy="56" rx="8" ry="11" fill="#80B8C9" /><path d="M72 54h6M48 52l-8-2" /><path d="m55 48 5-2m23 3 4-2" stroke="#D7F3EC" strokeWidth="2" strokeLinecap="round" /></g> : <g stroke={INK} strokeWidth="2.3"><circle cx="43" cy="54" r="12" fill="#80B8C9" /><circle cx="76" cy="54" r="12" fill="#80B8C9" /><path d="M55 53h9" /><path d="m39 47 5-2m28 2 5-2" stroke="#D7F3EC" strokeWidth="2" strokeLinecap="round" /></g>;
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
  if (view === "side" || view === "backQuarter") {
    const side = view === "side";
    const shoulder = side ? "M33 43Q44 29 59 31Q67 33 69 43Q61 50 47 53L33 62Z" : "M27 43Q40 29 58 30Q68 33 69 44Q59 52 40 57L26 66Z";
    const forehead = side ? "M78 34Q94 37 98 51L88 54Q75 47 78 34Z" : "M78 33Q95 37 101 52L88 55Q76 48 78 33Z";
    if (cat.id === "cloud") return <><path d={shoulder} fill={cat.patch} /><path d={forehead} fill={cat.patch} opacity=".8" /></>;
    if (cat.id === "calico") return <><path d={shoulder} fill={cat.patch} /><path d={forehead} fill="#DDA16D" /><path d="M41 71q8-8 15 1l-3 9-15-1Z" fill="#DDA16D" /></>;
    if (cat.id === "mango") return <><path d={shoulder} fill={cat.patch} /><path d={forehead} fill="#D7804D" /><path d="M39 66q7 4 13 0m19-6q5 3 10 0" stroke="#D7804D" strokeWidth="4" strokeLinecap="round" /></>;
    if (cat.id === "peach") return <><path d={shoulder} fill={cat.patch} /><path d={forehead} fill="#F4C4AF" /><path d="M39 71q7 4 13 0" stroke="#EAB5A2" strokeWidth="4" strokeLinecap="round" /></>;
    if (cat.id === "sunny") return <><path d={shoulder} fill={cat.patch} /><path d={forehead} fill="#F1C075" /></>;
    if (cat.id === "mocha") return <><path d={shoulder} fill={cat.patch} /><path d={forehead} fill="#A4735E" /><path d="M39 68q9 5 18 0" stroke="#D7AC8C" strokeWidth="5" strokeLinecap="round" opacity=".7" /></>;
    if (cat.id === "cocoa") return <><path d={shoulder} fill={cat.patch} /><path d={forehead} fill="#8C6256" /></>;
    return <><path d={shoulder} fill={cat.patch} />{cat.id === "artist" || cat.id === "explorer" || cat.id === "baker" ? <path d={forehead} fill={cat.patch} opacity=".78" /> : null}</>;
  }
  const back = view === "back";
  const shift = view === "quarter" ? 7 : 0;
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
      {cat.id === "baker" && <path d="M52 84q11 4 25 1v18H53Z" fill="#FFF4DB" />}
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

function Face({ mood, view, blink, compact, gaze = 0 }: { mood: DrawGuessCatMood; view: View; blink: boolean; compact: boolean; gaze?: number }) {
  if (view === "back") return null;
  if (view === "backQuarter") return <g><path d="M97 67q4 2 6 0" stroke={INK} strokeWidth="2" strokeLinecap="round" /><ellipse cx="99" cy="57" rx="2" ry={blink ? 1 : 3} fill={INK} /></g>;
  const quarter = view === "quarter";
  const side = view === "side";
  const left = side ? 82 : quarter ? 61 : 44;
  const right = quarter ? 86 : 76;
  const nose = side ? 103 : quarter ? 91 : 60;
  return <g>
    {!compact && !side && <><ellipse cx={quarter ? 59 : 42} cy="72" rx="6" ry="3.5" fill={BLUSH} opacity=".48" /><ellipse cx={quarter ? 92 : 82} cy="72" rx="6" ry="3.5" fill={BLUSH} opacity=".48" /></>}
    {!compact && side && <ellipse cx="89" cy="70" rx="5.5" ry="3.2" fill={BLUSH} opacity=".55" />}
    {mood === "happy" ? <path d={side ? "M76 55q5-6 10 0" : "M" + (left - 5) + " 55q5-6 10 0 M" + (right - 5) + " 55q5-6 10 0"} stroke={INK} strokeWidth="2.7" strokeLinecap="round" /> :
      mood === "sad" ? <path d={side ? "M76 54q5-2 9 3" : "M" + (left - 5) + " 54l10 4 M" + (right - 5) + " 58l10-4"} stroke={INK} strokeWidth="2.7" strokeLinecap="round" /> :
        <><ellipse cx={left + gaze} cy="55" rx="2.5" ry={blink ? .8 : 3.5} fill={INK} />{!side && <ellipse cx={right + gaze} cy="55" rx="2.5" ry={blink ? .8 : 3.5} fill={INK} />}</>}
    <path d={side ? "M99 64q3-2 5 1l-3 3Z" : "m" + (nose - 5) + " 66 5 3 5-3Z"} fill="#B87972" />
    {side ? <path d={mood === "sad" ? "M93 76q5-4 9 0" : mood === "happy" ? "M93 72q4 7 9 0" : "M95 71q3 5 7 0"} stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" /> :
      quarter ? <path d={mood === "sad" ? "M84 78q7-5 13 0" : mood === "happy" ? "M91 71q-7 12-14 1m14-1q6 8 11 0" : "M92 69v4m0 0q-4 4-8 0m8 0q4 4 8 0"} stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" /> :
        mood === "happy" ? <path d={"M" + nose + " 70q-10 14-18 0m18 0q10 14 18 0"} stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" /> :
          mood === "sad" ? <path d={"M" + (nose - 8) + " 77q8-7 16 0"} stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" /> :
            <path d={"M" + nose + " 69v4m0 0q-5 4-9 0m9 0q5 4 9 0"} stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" />}
    {mood === "sad" && <path d={side ? "M86 63q-3 5-1 7 3 1 3-2Z" : "M" + (right + 3) + " 63q-3 5-1 7 3 1 3-2Z"} fill="#89C7DD" />}
    {!compact && side && <path d="m94 67 6-2m-6 6 6 1" stroke={SOFT_INK} strokeWidth="1.3" strokeLinecap="round" opacity=".72" />}
    {!compact && !side && <path d={quarter ? "m51 68-8-2m9 6-8 1m55-8 7-2m-6 6 7 1" : "m35 67-8-2m9 6-8 1m57-5 8-2m-9 6 8 1"} stroke={SOFT_INK} strokeWidth="1.3" strokeLinecap="round" opacity=".75" />}
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
      <g transform={"translate(0 " + motionAt(cat, mood, frame, "default").y + ")"}>
        <path d={tailFor(cat, "front")} fill={cat.patch} stroke={INK} strokeWidth="3.8" strokeLinejoin="round" />
        <path d={earsFor(cat, "front")} fill={cat.fur} stroke={INK} strokeWidth="4.2" strokeLinejoin="round" />
        <path d={head} fill={cat.fur} stroke={INK} strokeWidth="4.2" />
        <g clipPath={"url(#" + id + ")"}><Markings cat={cat} view="front" /><Outfit cat={cat} view="front" path={SHAPES.front.clothes} compact /></g>
        <Face mood={mood} view="front" blink={mood === "idle" && frame === 10} compact />
        <Glasses cat={cat} view="front" />
        <Hat cat={cat} view="front" />
        <CharacterAccent cat={cat} view="front" compact />
        {cat.id === "peach" && <path d="m88 35 9-5-2 10-7-3-8 3v-9Z" fill="#E8A99B" stroke={INK} strokeWidth="2" />}
      </g>
    </svg>
  </span>;
}

export function DrawGuessCatSprite({ activity = "none", animated = false, catId, className = "", direction = "S", frame, mood = "idle", performance = "default", size = 72, title }: {
  activity?: DrawGuessCatActivity;
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
  useEffect(() => setAnimatedFrame(mood === "idle" && performance !== "wave" ? PERSONALITY[cat.id].phase : 0), [activity, cat.id, mood, performance]);
  useEffect(() => {
    if (!animated || frame !== undefined) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    const syncMotion = () => {
      if (timer !== undefined) window.clearInterval(timer);
      if (reducedMotion.matches) {
        setAnimatedFrame(activity === "none" ? 0 : 8);
        return;
      }
      if (document.hidden) return;
      timer = window.setInterval(() => setAnimatedFrame((current) => (current + 1) % (activity === "none" ? DRAW_GUESS_CAT_FRAME_COUNT : DRAW_GUESS_ACTIVITY_FRAME_COUNT)), activity === "drawing" ? 90 : activity === "thinking" ? 112 : mood === "happy" ? 75 : mood === "sad" ? 120 : 155 + PERSONALITY[cat.id].phase % 3 * 12);
    };
    syncMotion();
    reducedMotion.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      reducedMotion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
    };
  }, [activity, animated, cat.id, frame, mood]);

  const current = frame !== undefined && Number.isFinite(frame) ? Math.trunc(frame) : animatedFrame;
  const frameCount = activity === "none" ? DRAW_GUESS_CAT_FRAME_COUNT : DRAW_GUESS_ACTIVITY_FRAME_COUNT;
  const activeFrame = ((current % frameCount) + frameCount) % frameCount;
  const bodyFrame = activity === "none" ? activeFrame : ACTIVITY_BODY_FRAMES[activeFrame];
  if (size <= 36) return <TinyCat cat={cat} className={className} frame={bodyFrame} id={uniqueId + "-tiny"} mood={mood} size={size} title={title} />;
  const view: View = direction === "S" ? "front" : direction === "SE" || direction === "SW" ? "quarter" : direction === "E" || direction === "W" ? "side" : direction === "NE" || direction === "NW" ? "backQuarter" : "back";
  const mirror = direction === "SW" || direction === "W" || direction === "NW";
  const back = view === "back" || view === "backQuarter";
  const shape = SHAPES[view];
  const compact = size <= 72;
  const motion = motionAt(cat, mood, bodyFrame, performance);
  const blink = mood === "idle" && bodyFrame === 10;
  const furLight = mix(cat.fur, "#FFFFFF", .16);
  const furDark = mix(cat.fur, "#705746", .18);
  const faceX = view === "front" ? 60 : view === "quarter" ? 73 : 88;
  const clipId = uniqueId + "-clip";
  const gradientId = uniqueId + "-fur";
  const earPath = earsFor(cat, view);
  const tailPath = tailFor(cat, view);
  const drawing = activity === "drawing" && view === "front";
  const thinking = activity === "thinking" && view === "front";
  const drawingPose = DRAWING_POSES[activeFrame % DRAW_GUESS_ACTIVITY_FRAME_COUNT];
  const thinkingPose = THINKING_POSES[activeFrame % DRAW_GUESS_ACTIVITY_FRAME_COUNT];
  const poseTransform = "translate(0 " + motion.y + ") rotate(" + motion.tilt + " 60 69) translate(60 69) scale(" + motion.scaleX + " " + motion.scaleY + ") translate(-60 -69)";
  return <span className={"inline-grid shrink-0 place-items-center " + className} style={{ width: size, height: size }} title={title} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} data-cat={cat.id} data-detail={compact ? "compact" : "full"} data-direction={direction} data-view={view} data-frame={activeFrame} data-mood={mood} data-performance={performance} data-activity={activity}>
    <svg viewBox="0 0 120 116" width="100%" height="100%" fill="none" aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="26" y1="30" x2="100" y2="102" gradientUnits="userSpaceOnUse"><stop stopColor={furLight} /><stop offset=".62" stopColor={cat.fur} /><stop offset="1" stopColor={furDark} /></linearGradient>
        <clipPath id={clipId}><path d={shape.body} /></clipPath>
      </defs>
      <ellipse cx="60" cy="108" rx={mood === "happy" && motion.y < -7 ? 26 : 32} ry="4.5" fill="#55443A" opacity={mood === "happy" && motion.y < -7 ? .09 : .14} />
      <g transform={mirror ? "translate(120 0) scale(-1 1)" : undefined}>
        <g transform={poseTransform}>
          <g transform={"translate(0 " + motion.tailY + ") rotate(" + motion.tailAngle + " " + (view === "front" || view === "back" ? 91 : 36) + " 85)"}><path d={tailPath} fill={cat.patch} stroke={INK} strokeWidth={compact ? 3.2 : 2.8} strokeLinecap="round" strokeLinejoin="round" /></g>
          {(view === "quarter" || view === "side" || view === "backQuarter") && <g><ellipse cx={view === "side" ? 42 : 32} cy="84" rx="7.5" ry="6" fill={furDark} stroke={INK} strokeWidth="2.2" /><ellipse cx={view === "side" ? 52 : 47} cy="101" rx="8.5" ry="4.5" fill={furDark} stroke={INK} strokeWidth="2" /></g>}
          <g transform={"rotate(" + motion.earTilt + " " + (view === "side" ? 72 : 60) + " 39)"}>
            <g transform={mood === "sad" ? "translate(0 4) scale(1 .9)" : undefined}>
              <path d={earPath} fill={cat.fur} stroke={INK} strokeWidth={compact ? 3.2 : 2.8} strokeLinejoin="round" />
              {!compact && shape.innerEar && <path d={shape.innerEar} fill="#DDA391" />}
            </g>
          </g>
          <path d={shape.body} fill={compact ? cat.fur : "url(#" + gradientId + ")"} stroke={INK} strokeWidth={compact ? 3.2 : 2.8} strokeLinejoin="round" />
          <g clipPath={"url(#" + clipId + ")"}>
            <Markings cat={cat} view={view} />
            {!compact && !back && <><path d={view === "side" ? "M72 70q10-7 20-2 6 4 5 11l-9 6q-10-2-16-15Z" : "M41 69q3-9 13-11 6-1 10 4 7-6 15-3 8 4 7 12l-5 11H39Z"} fill={mix(cat.fur, "#FFF7DF", .29)} opacity=".88" /><path d={view === "side" ? "M76 77q8 5 17 1" : "M43 76q18 5 36 0"} stroke="#FFFFFF" strokeOpacity=".28" strokeWidth="1.6" fill="none" /></>}
            {back && <><path d="M43 42q17 7 34 0m-31 9q14 6 28 0" stroke={mix(cat.patch, cat.fur, .38)} strokeWidth={compact ? 5 : 4} strokeLinecap="round" opacity=".75" /><path d="M59 81v22" stroke={INK} strokeWidth="1.5" opacity=".3" /></>}
            <Outfit cat={cat} view={view} path={shape.clothes} compact={compact} />
            {!compact && <path d={view === "side" ? "M45 45q-6 17-2 32" : "M28 54q-5 15 0 25"} stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" opacity=".22" />}
          </g>
          <Face mood={mood} view={view} blink={blink} compact={compact} gaze={thinking ? thinkingPose.gaze : motion.gaze} />
          <Glasses cat={cat} view={view} />
          <Hat cat={cat} view={view} />
          <CharacterAccent cat={cat} view={view} compact={compact} />
          {drawing && <g>
            <path d="M79 88q0-3 3-4l31-3q3 0 4 3l3 22q0 3-3 4l-31 3q-3 0-4-3Z" fill="#FFFDF8" stroke="#88AECB" strokeWidth="2" />
            <path d="m86 94 7-1m-6 6 8-1" stroke="#C7DDEA" strokeWidth="1.3" strokeLinecap="round" />
            {drawingPose.ink > 0 && <path d="M100 100q1-4 3-2t4-1q2-1 3 2t2-2" pathLength={100} stroke="#4A80AF" strokeWidth="2.2" strokeLinecap="round" strokeDasharray={`${drawingPose.ink} 100`} opacity={drawingPose.fade} />}
          </g>}
          {drawing && <g>
            <path d={`M${drawingPose.x - 11} ${drawingPose.y - 25} ${drawingPose.x} ${drawingPose.y}`} stroke={INK} strokeWidth="5" strokeLinecap="round" />
            <path d={`M${drawingPose.x - 11} ${drawingPose.y - 25} ${drawingPose.x - 1} ${drawingPose.y - 3}`} stroke="#F5B851" strokeWidth="3.2" strokeLinecap="round" />
            <path d={`m${drawingPose.x - 2} ${drawingPose.y - 5} 2 5 2-5`} fill="#EBC89A" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
            <path d={`m${drawingPose.x - 12} ${drawingPose.y - 26} -1-3 3-1 2 4`} fill="#DF8A8B" stroke={INK} strokeWidth="1.2" />
          </g>}
          {(view === "front" || view === "back") && <ellipse cx={27 + motion.handsIn} cy={86 - motion.leftLift} rx="8.5" ry="7" fill={cat.fur} stroke={INK} strokeWidth="2.4" />}
          {view === "side" ? <g transform={"rotate(" + -motion.rightLift * 3 + " 82 78)"}><path d="M82 77Q90 74 95 78Q99 83 96 88Q92 92 87 90Q82 87 82 82Z" fill={cat.fur} /><path d="M84 77Q91 74 95 78Q99 83 96 88Q92 92 87 90" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" fill="none" />{!compact && <path d="M89 87q3 2 6-1" stroke={furDark} strokeWidth="1.2" strokeLinecap="round" />}</g> : <ellipse cx={drawing ? drawingPose.x - 12 : thinking ? thinkingPose.x : (view === "front" || view === "back" ? 93 : view === "backQuarter" ? 89 : 91) - motion.handsIn + motion.rightOut} cy={drawing ? drawingPose.y - 18 : thinking ? thinkingPose.y : 86 - motion.rightLift} rx="8.5" ry="7" fill={cat.fur} stroke={INK} strokeWidth="2.4" />}
          {view !== "side" && view !== "backQuarter" && <ellipse cx={43 + motion.footStep} cy="102" rx="11" ry="5" fill={furDark} stroke={INK} strokeWidth="2.3" />}
          <ellipse cx={(view === "front" || view === "back" ? 78 : 80) - motion.footStep} cy="102" rx={view === "side" ? 12 : 11} ry="5" fill={furDark} stroke={INK} strokeWidth="2.3" />
          {!compact && view !== "side" && view !== "backQuarter" && <path d={"M" + (38 + motion.footStep) + " 101q5-2 10 0M" + (73 - motion.footStep) + " 101q5-2 10 0"} stroke={furLight} strokeWidth="1.6" strokeLinecap="round" />}
          {mood === "happy" && activeFrame >= 4 && activeFrame <= 7 && <path d="m13 45 3-5m-3 11-5-1m99-5 3-5m-3 11 5-1" stroke="#E8B954" strokeWidth="2.3" strokeLinecap="round" />}
          {cat.id === "peach" && !back && <g><path d="m87 34 8-4-1 9-7-3-7 3v-8Z" fill="#E6A695" stroke={INK} strokeWidth="1.4" /><circle cx="87" cy="35" r="2.2" fill="#F7E3B8" /></g>}
          {cat.id === "sunny" && !back && <circle cx={faceX + 22} cy="43" r="3" fill="#F5D37C" stroke={INK} strokeWidth="1" />}
          {cat.id === "inventor" && !back && <path d="M42 28q18-6 36 0" stroke="#D6E0D2" strokeWidth="2" strokeLinecap="round" />}
        </g>
      </g>
      {thinking && thinkingPose.bubble > 0 && <g transform={`translate(0 ${[0, 0, 0, 0, -1, -1, -2, -3, -3, -2, -1, 0, 0, 1, 0, 0, 0, 0][activeFrame]})`}>
        <circle cx="91" cy="45" r="2" fill="#FFFDF8" stroke="#8CAFCB" strokeWidth="1.2" />
        {thinkingPose.bubble >= 2 && <circle cx="97" cy="37" r="3.5" fill="#FFFDF8" stroke="#8CAFCB" strokeWidth="1.4" />}
        {thinkingPose.bubble >= 3 && <><circle cx="108" cy="25" r="10" fill="#FFFDF8" stroke="#8CAFCB" strokeWidth="2" /><path d="M104 23q0-4 4-4 4 0 4 4 0 2-3 4v2" stroke="#4A719D" strokeWidth="2" strokeLinecap="round" fill="none" /><circle cx="109" cy="32" r="1.2" fill="#4A719D" /></>}
      </g>}
    </svg>
  </span>;
}

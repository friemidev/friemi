import "server-only";

import sharp from "sharp";
import type { Prisma } from "@prisma/client";
import { getChainActor, isValidDrawing, type DrawGuessState, type DrawStroke } from "@/features/game-tools/drawGuessEngine";
import { prisma } from "@/lib/prisma";

export type ArtworkChange = {
  artistSeat: number;
  ownerSeat: number;
  stage: number;
  strokes: DrawStroke[];
  submitted: boolean;
};

function sameDrawing(left: DrawStroke[] | undefined, right: DrawStroke[]) {
  return JSON.stringify(left ?? []) === JSON.stringify(right);
}

export function compactDrawGuessState(state: DrawGuessState): Prisma.InputJsonValue {
  const compact = structuredClone(state);
  compact.storageVersion = 1;
  compact.commandResults = {};
  compact.drafts = {};
  compact.drawings = compact.drawings.map(() => []);
  compact.chains = compact.chains.map((chain) => chain.map((step) => step.kind === "DRAWING" ? { ...step, value: [] } : step));
  return compact as unknown as Prisma.InputJsonValue;
}

export async function hydrateDrawGuessState(roomId: string, state: DrawGuessState) {
  const artworks = await prisma.drawGuessArtwork.findMany({
    where: { roomId, roundNumber: state.gameNumber },
    select: { ownerSeat: true, stage: true, strokes: true, submittedAt: true },
  });
  for (const artwork of artworks) {
    if (!isValidDrawing(artwork.strokes)) continue;
    const strokes = artwork.strokes;
    if (state.mode === "CLASSIC" && artwork.stage === 0) {
      state.drawings[artwork.ownerSeat] = strokes;
    } else if (state.mode === "CHAIN") {
      const step = state.chains[artwork.ownerSeat]?.[artwork.stage];
      if (artwork.submittedAt && step?.kind === "DRAWING") step.value = strokes;
      if (!artwork.submittedAt) state.drafts[`${artwork.ownerSeat}:${artwork.stage}`] = strokes;
    }
  }
  return state;
}

export function changedDrawGuessArtworks(before: DrawGuessState, after: DrawGuessState, playerCount: number): ArtworkChange[] {
  if (before.gameNumber !== after.gameNumber) return [];
  const changes: ArtworkChange[] = [];
  const legacy = before.storageVersion !== 1;
  if (after.mode === "CLASSIC") {
    after.drawings.forEach((strokes, ownerSeat) => {
      const newlySubmitted = before.turnIndex === ownerSeat && (after.turnIndex > ownerSeat || after.phase === "FINISHED");
      if ((legacy && strokes.length > 0) || !sameDrawing(before.drawings[ownerSeat], strokes) || newlySubmitted) {
        changes.push({ artistSeat: ownerSeat, ownerSeat, stage: 0, strokes, submitted: after.turnIndex > ownerSeat || after.phase === "FINISHED" });
      }
    });
    return changes;
  }
  after.chains.forEach((chain, ownerSeat) => chain.forEach((step, stage) => {
    if (step.kind !== "DRAWING") return;
    const previous = before.chains[ownerSeat]?.[stage];
    if (legacy || previous?.kind !== "DRAWING" || !sameDrawing(previous.value, step.value)) {
      changes.push({ artistSeat: step.seat, ownerSeat, stage, strokes: step.value, submitted: true });
    }
  }));
  for (const [key, strokes] of Object.entries(after.drafts)) {
    const [ownerSeat, stage] = key.split(":").map(Number);
    if (!Number.isInteger(ownerSeat) || !Number.isInteger(stage) || ownerSeat < 0 || ownerSeat >= playerCount || stage % 2 !== 1) continue;
    if (after.chains[ownerSeat]?.[stage]?.kind === "DRAWING") continue;
    if (legacy || !sameDrawing(before.drafts[key], strokes)) {
      changes.push({ artistSeat: getChainActor(ownerSeat, stage, playerCount), ownerSeat, stage, strokes, submitted: false });
    }
  }
  return changes;
}

function artworkSvg(strokes: DrawStroke[]) {
  const paths = strokes.map((stroke) => {
    const [first, ...rest] = stroke.points;
    if (rest.length === 0) return `<circle cx="${first[0] * 600}" cy="${first[1] * 420}" r="${stroke.width / 2}" fill="${stroke.color}"/>`;
    const path = `M ${first[0] * 600} ${first[1] * 420} ${rest.map(([x, y]) => `L ${x * 600} ${y * 420}`).join(" ")}`;
    return `<path d="${path}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420"><rect width="600" height="420" fill="#ffffff"/>${paths}</svg>`;
}

export async function prepareArtworkChanges(changes: ArtworkChange[]) {
  return Promise.all(changes.map(async (change) => {
    if (!isValidDrawing(change.strokes)) throw new Error("INVALID_DRAWING_PERSISTENCE");
    const png = await sharp(Buffer.from(artworkSvg(change.strokes))).png({ compressionLevel: 9 }).toBuffer();
    if (png.byteLength > 512_000) throw new Error("DRAW_GUESS_PREVIEW_TOO_LARGE");
    return { ...change, png };
  }));
}

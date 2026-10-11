import type { DrawGuessInkCursor, DrawStroke } from "./drawGuessEngine";

export type DrawGuessInkBatch = { inkCursor?: DrawGuessInkCursor; seq: number; stroke: DrawStroke; strokeIndex: number };
export type DrawGuessInkSnapshot = { drawing: DrawStroke[]; inkCursor?: DrawGuessInkCursor | null; revision: number; seq: number };
export type DrawGuessInkBuffer = DrawGuessInkSnapshot & { events: DrawGuessInkBatch[] };

function isAcknowledged(event: DrawGuessInkBatch, snapshot: DrawGuessInkSnapshot) {
  return event.seq <= snapshot.seq || Boolean(event.inkCursor && snapshot.inkCursor &&
    event.inkCursor.clientId === snapshot.inkCursor.clientId && event.inkCursor.seq <= snapshot.inkCursor.seq);
}

export function createDrawGuessInkBuffer(snapshot: DrawGuessInkSnapshot): DrawGuessInkBuffer {
  return { ...snapshot, events: [] };
}

export function mergeDrawGuessInkSnapshot(buffer: DrawGuessInkBuffer, snapshot: DrawGuessInkSnapshot): DrawGuessInkBuffer {
  if (snapshot.revision < buffer.revision || snapshot.seq < buffer.seq) return buffer;
  return { ...snapshot, events: buffer.events.filter((event) => !isAcknowledged(event, snapshot)) };
}

export function mergeDrawGuessInkBatch(buffer: DrawGuessInkBuffer, event: DrawGuessInkBatch): DrawGuessInkBuffer {
  if (isAcknowledged(event, buffer)) return buffer;
  const previous = buffer.events.find((item) => item.strokeIndex === event.strokeIndex);
  if (previous) {
    // A timed-out request can reach the server after a newer request. Within
    // one publisher session, its source order is the stroke's drawing order.
    const sameClient = previous.inkCursor && event.inkCursor && previous.inkCursor.clientId === event.inkCursor.clientId;
    if (sameClient ? previous.inkCursor!.seq >= event.inkCursor!.seq : previous.seq >= event.seq) return buffer;
  }
  // Each broadcast contains the whole stroke. Retaining its latest batch bounds
  // the buffer by the 120-stroke limit without evicting another stroke's data.
  return { ...buffer, events: [...buffer.events.filter((item) => item.strokeIndex !== event.strokeIndex), event] };
}

export function getDrawGuessInkDrawing(buffer: DrawGuessInkBuffer): DrawStroke[] {
  const drawing = [...buffer.drawing];
  // A later update to an earlier stroke must still supply the prefix required
  // by subsequent strokes, even when broadcasts arrive out of order.
  for (const event of [...buffer.events].sort((a, b) => a.strokeIndex - b.strokeIndex)) {
    if (event.strokeIndex <= drawing.length) drawing[event.strokeIndex] = event.stroke;
  }
  return drawing;
}
